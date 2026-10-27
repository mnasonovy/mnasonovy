import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function updatePassword(formData: FormData) {
  'use server'
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (password.length < 10) redirect(`/update-password?error=${encodeURIComponent('Пароль должен быть минимум 10 символов.')}`)
  if (password !== confirm) redirect(`/update-password?error=${encodeURIComponent('Пароли не совпадают.')}`)

  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/login')

  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(`/update-password?error=${encodeURIComponent('Не удалось сменить пароль. Запроси новую ссылку восстановления.')}`)

  redirect(`/security?message=${encodeURIComponent('Пароль обновлён.')}`)
}

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
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
  </section></main>
}
