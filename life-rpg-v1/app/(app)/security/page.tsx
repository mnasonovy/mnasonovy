import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MfaSettings } from '@/components/mfa-settings'

export const dynamic = 'force-dynamic'

async function sendPasswordReset() {
  'use server'
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user?.email) redirect('/login')
  const h = await headers()
  const origin = h.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  await supabase.auth.resetPasswordForEmail(data.user.email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  })
  redirect(`/security?message=${encodeURIComponent('Ссылка для смены пароля отправлена на почту.')}`)
}

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect('/login')

  const providers = [...new Set((data.user.identities ?? []).map((identity) => identity.provider))]

  return <>
    <div className="eyebrow">Аккаунт</div>
    <h1 className="title">Безопасность</h1>
    <p className="subtitle">Способы входа, пароль и двухфакторная защита персонажа.</p>
    {params.message && <p className="success">{params.message}</p>}

    <section className="section grid grid2">
      <article className="card">
        <div className="eyebrow">Учётная запись</div>
        <h2>Способы входа</h2>
        <div className="securityRow"><span className="muted">Email</span><strong>{data.user.email ?? '—'}</strong></div>
        <div className="securityRow"><span className="muted">Подтверждён</span><strong>{data.user.email_confirmed_at ? 'Да' : 'Нет'}</strong></div>
        <div className="securityRow"><span className="muted">Провайдеры</span><div className="actions">{providers.length ? providers.map((provider) => <span className="pill" key={provider}>{provider}</span>) : <span className="pill">email</span>}</div></div>
        <form action={sendPasswordReset} style={{marginTop:18}}><button className="btn">Отправить ссылку для смены пароля</button></form>
      </article>

      <article className="card">
        <div className="eyebrow">TOTP</div>
        <h2>Двухфакторная защита</h2>
        <p className="muted">После включения одного пароля или Google-входа будет недостаточно: v1-данные дополнительно защищаются AAL2 на уровне Postgres RLS.</p>
        <MfaSettings />
      </article>
    </section>
  </>
}
