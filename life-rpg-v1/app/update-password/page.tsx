import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function requireRecoveryReady() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/forgot-password?error=' + encodeURIComponent('Сессия восстановления недействительна. Запроси новую ссылку.'))

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect('/mfa?next=' + encodeURIComponent('/update-password'))
  }

  return supabase
}

async function updatePassword(formData: FormData) {
  'use server'
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (password.length < 10) redirect(`/update-password?error=${encodeURIComponent('Пароль должен быть минимум 10 символов.')}`)
  if (password !== confirm) redirect(`/update-password?error=${encodeURIComponent('Пароли не совпадают.')}`)

  const supabase = await requireRecoveryReady()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    const message = error.code === 'insufficient_aal'
      ? 'Для смены пароля нужно подтвердить 2FA.'
      : 'Не удалось сменить пароль. Recovery-ссылка могла истечь или уже быть использована.'
    if (error.code === 'insufficient_aal') redirect('/mfa?next=' + encodeURIComponent('/update-password'))
    redirect(`/update-password?error=${encodeURIComponent(message)}`)
  }

  redirect(`/security?message=${encodeURIComponent('Пароль обновлён.')}`)
}

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  await requireRecoveryReady()

  return <main className="auth"><section className="card authCard">
    <div className="eyebrow">Новый пароль</div>
    <h1 className="title">Защитить аккаунт</h1>
    <p className="subtitle">Используй отдельный пароль длиной не меньше 10 символов.</p>
    {params.error && <p className="error">{params.error}</p>}
    <form className="form" action={updatePassword}>
      <div className="field"><label>Новый пароль</label><input className="input" type="password" name="password" minLength={10} autoComplete="new-password" required /></div>
      <div className="field"><label>Повтори пароль</label><input className="input" type="password" name="confirm" minLength={10} autoComplete="new-password" required /></div>
      <button className="btn btnPrimary">Сохранить пароль</button>
    </form>
    <p className="muted" style={{marginTop:14,fontSize:13}}>Если ссылка больше не работает, <Link href="/forgot-password" style={{color:'var(--accent)'}}>запроси новую</Link>.</p>
  </section></main>
}
