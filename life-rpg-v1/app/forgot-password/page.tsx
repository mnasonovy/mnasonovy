import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function requestReset(formData: FormData) {
  'use server'
  const email = String(formData.get('email') ?? '').trim()
  if (!email) redirect('/forgot-password?error=Укажи email')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/update-password`,
  })

  if (error) {
    const isRateLimit = error.status === 429 || error.code === 'over_email_send_rate_limit'
    const message = isRateLimit
      ? 'Слишком много писем восстановления было запрошено подряд. Supabase временно ограничил отправку. Попробуй позже — повторные клики сейчас письмо не отправят.'
      : 'Не удалось отправить письмо восстановления. Попробуй ещё раз позже.'
    redirect(`/forgot-password?error=${encodeURIComponent(message)}`)
  }

  redirect(`/forgot-password?message=${encodeURIComponent('Ссылка для смены пароля отправлена на почту. Используй самое новое письмо — recovery-ссылки одноразовые.')}`)
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams
  return <main className="auth"><section className="card authCard">
    <div className="eyebrow">Восстановление доступа</div>
    <h1 className="title">Сменить пароль</h1>
    <p className="subtitle">Введи email аккаунта. После перехода по ссылке аккаунт с включённой 2FA дополнительно попросит TOTP-код.</p>
    {params.error && <p className="error">{params.error}</p>}
    {params.message && <p className="success">{params.message}</p>}
    <form className="form" action={requestReset}>
      <div className="field"><label>Email</label><input className="input" name="email" type="email" autoComplete="email" required /></div>
      <button className="btn btnPrimary">Отправить ссылку</button>
    </form>
    <p className="muted"><Link href="/login" style={{color:'var(--accent)'}}>← Вернуться ко входу</Link></p>
  </section></main>
}
