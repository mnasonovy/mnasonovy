import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function requestReset(formData: FormData) {
  'use server'
  const email = String(formData.get('email') ?? '').trim()
  if (!email) redirect('/forgot-password?error=Укажи email')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const supabase = await createClient()

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/update-password`,
  })

  redirect(`/forgot-password?message=${encodeURIComponent('Если такой аккаунт существует, ссылка для смены пароля уже отправлена на почту.')}`)
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams
  return <main className="auth"><section className="card authCard">
    <div className="eyebrow">Восстановление доступа</div>
    <h1 className="title">Сменить пароль</h1>
    <p className="subtitle">Введи email аккаунта. Мы не показываем, существует ли такой адрес в системе.</p>
    {params.error && <p className="error">{params.error}</p>}
    {params.message && <p className="success">{params.message}</p>}
    <form className="form" action={requestReset}>
      <div className="field"><label>Email</label><input className="input" name="email" type="email" autoComplete="email" required /></div>
      <button className="btn btnPrimary">Отправить ссылку</button>
    </form>
    <p className="muted"><Link href="/login" style={{color:'var(--accent)'}}>← Вернуться ко входу</Link></p>
  </section></main>
}
