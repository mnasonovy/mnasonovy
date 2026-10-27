import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MfaChallenge } from '@/components/mfa-challenge'

export const dynamic = 'force-dynamic'

export default async function MfaPage() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims?.sub) redirect('/login')

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (!aal || aal.nextLevel !== 'aal2' || aal.currentLevel === 'aal2') redirect('/today')

  return <main className="auth"><section className="card authCard">
    <div className="eyebrow">Дополнительная защита</div>
    <h1 className="title">Подтверди вход</h1>
    <p className="subtitle">Для этого аккаунта включена двухфакторная аутентификация.</p>
    <MfaChallenge />
  </section></main>
}
