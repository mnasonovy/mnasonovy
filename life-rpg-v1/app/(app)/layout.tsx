import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RealtimeRefresh } from '@/components/realtime-refresh'
import { TimezoneSync } from '@/components/timezone-sync'
import { AtmosphereShell } from '@/components/atmosphere-shell'
import { AppNav } from '@/components/app-nav'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) redirect('/login')

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') redirect('/mfa')

  const { data: profile } = await supabase.from('profiles').select('display_name,timezone').eq('id', userId).maybeSingle()
  const displayName = profile?.display_name || 'Странник'

  return <AtmosphereShell displayName={displayName}>
    <div className="shell">
      <RealtimeRefresh userId={userId}/>
      <TimezoneSync userId={userId} currentTimezone={profile?.timezone || 'UTC'} />
      <aside className="sidebar">
        <div className="brandBlock">
          <div className="brandMark">✦</div>
          <div><div className="brand">Emberive</div><div className="brandTagline">Жизнь как большое приключение</div></div>
        </div>
        <AppNav />
        <div className="sidebarFooter">
          <div className="characterMini"><span className="characterAvatar">◈</span><div><strong>{displayName}</strong><span>Твой путь продолжается</span></div></div>
          <form action="/auth/signout" method="post"><button className="btn btnQuiet">Выйти</button></form>
        </div>
      </aside>
      <main className="main">{children}</main>
      <AppNav mobile />
    </div>
  </AtmosphereShell>
}
