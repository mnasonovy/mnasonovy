import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RealtimeRefresh } from '@/components/realtime-refresh'
import { TimezoneSync } from '@/components/timezone-sync'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) redirect('/login')

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') redirect('/mfa')

  const { data: profile } = await supabase.from('profiles').select('display_name,timezone').eq('id', userId).maybeSingle()
  const nav = [
    ['/today','☀️ Сегодня'],
    ['/quests','🎯 Квесты'],
    ['/map','🌳 Карта'],
    ['/progress','📈 Прогресс'],
    ['/security','🛡️ Защита'],
  ] as const

  return <div className="shell">
    <RealtimeRefresh userId={userId}/>
    <TimezoneSync userId={userId} currentTimezone={profile?.timezone || 'UTC'} />
    <aside className="sidebar">
      <div className="brand">🔥 Life RPG <span className="pill">v1 dev</span></div>
      <nav className="nav">{nav.map(([href,label])=><Link href={href} key={href}>{label}</Link>)}</nav>
      <div style={{position:'absolute',bottom:24,left:18,right:18}}><div className="muted">{profile?.display_name || 'Персонаж'}</div><form action="/auth/signout" method="post" style={{marginTop:10}}><button className="btn">Выйти</button></form></div>
    </aside>
    <main className="main">{children}</main>
    <nav className="mobileNav">{nav.map(([href,label])=><Link href={href} key={href}>{label}</Link>)}</nav>
  </div>
}
