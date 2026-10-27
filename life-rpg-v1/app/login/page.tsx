import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function login(formData: FormData) {
  'use server'
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!email || password.length < 8) redirect('/login?error=Проверьте данные')
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(`/login?error=${encodeURIComponent('Не удалось войти. Проверь email, пароль и подтверждение почты.')}`)
  redirect('/today')
}

async function loginWithGoogle() {
  'use server'
  const h = await headers()
  const origin = h.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback?next=/today` },
  })
  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent('Google-вход пока недоступен. Можно войти по email и паролю.')}`)
  }
  redirect(data.url)
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams
  return <main className="auth"><section className="card authCard">
    <div className="eyebrow">Life RPG v1</div><h1 className="title">С возвращением</h1>
    <p className="subtitle">Один аккаунт — один прогресс на всех устройствах.</p>
    {params.error && <p className="error">{params.error}</p>}{params.message && <p className="success">{params.message}</p>}
    <form action={loginWithGoogle}><button className="btn oauthBtn" type="submit">G&nbsp;&nbsp;Продолжить с Google</button></form>
    <div className="authDivider"><span>или</span></div>
    <form action={login} className="form"><div className="field"><label>Email</label><input className="input" name="email" type="email" autoComplete="email" required /></div><div className="field"><label>Пароль</label><input className="input" name="password" type="password" autoComplete="current-password" minLength={8} required /></div><button className="btn btnPrimary">Войти</button></form>
    <div className="authLinks"><Link href="/forgot-password">Забыл пароль</Link><span className="muted">·</span><Link href="/register">Создать аккаунт</Link></div>
  </section></main>
}
