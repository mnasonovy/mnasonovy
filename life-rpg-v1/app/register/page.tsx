import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function register(formData: FormData) {
  'use server'
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const displayName = String(formData.get('displayName') ?? '').trim().slice(0, 80)
  if (!email || password.length < 10) redirect(`/register?error=${encodeURIComponent('Пароль должен быть минимум 10 символов')}`)
  const h = await headers()
  const origin = h.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: `${origin}/auth/callback` } })
  if (error) redirect(`/register?error=${encodeURIComponent(error.message)}`)
  if (data.session) redirect('/today')
  redirect(`/login?message=${encodeURIComponent('Аккаунт создан. Подтверди email и затем войди.')}`)
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return <main className="auth"><section className="card authCard"><div className="eyebrow">Новый персонаж</div><h1 className="title">Создать аккаунт</h1><p className="subtitle">Сначала email/password. OAuth и MFA подключаем следующим security-слоем.</p>{params.error && <p className="error">{params.error}</p>}<form action={register} className="form"><div className="field"><label>Имя</label><input className="input" name="displayName" maxLength={80}/></div><div className="field"><label>Email</label><input className="input" name="email" type="email" autoComplete="email" required/></div><div className="field"><label>Пароль</label><input className="input" name="password" type="password" minLength={10} autoComplete="new-password" required/></div><button className="btn btnPrimary">Создать персонажа</button></form><p className="muted">Уже есть аккаунт? <Link href="/login" style={{color:'var(--accent)'}}>Войти</Link></p></section></main>
}
