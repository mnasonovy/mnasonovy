import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function login(formData: FormData) {
  'use server'
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!email || password.length < 8) redirect('/login?error=Проверьте данные')
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect(`/login?error=${encodeURIComponent('Не удалось войти. Проверьте email, пароль и подтверждение почты.')}`)
  redirect('/today')
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams
  return <main className="auth"><section className="card authCard">
    <div className="eyebrow">Life RPG v1</div><h1 className="title">С возвращением</h1>
    <p className="subtitle">Один аккаунт — один прогресс на всех устройствах.</p>
    {params.error && <p className="error">{params.error}</p>}{params.message && <p className="success">{params.message}</p>}
    <form action={login} className="form"><div className="field"><label>Email</label><input className="input" name="email" type="email" autoComplete="email" required /></div><div className="field"><label>Пароль</label><input className="input" name="password" type="password" autoComplete="current-password" minLength={8} required /></div><button className="btn btnPrimary">Войти</button></form>
    <p className="muted">Нет аккаунта? <Link href="/register" style={{color:'var(--accent)'}}>Создать</Link></p>
  </section></main>
}
