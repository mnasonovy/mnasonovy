'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TotpFactor = {
  id: string
  friendly_name?: string
  status: string
}

export function MfaSettings() {
  const supabase = createClient()
  const [factors, setFactors] = useState<TotpFactor[]>([])
  const [currentLevel, setCurrentLevel] = useState<string | null>(null)
  const [nextLevel, setNextLevel] = useState<string | null>(null)
  const [factorId, setFactorId] = useState('')
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const [factorResult, aalResult] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ])
    if (factorResult.error) throw factorResult.error
    if (aalResult.error) throw aalResult.error
    setFactors(factorResult.data.totp as TotpFactor[])
    setCurrentLevel(aalResult.data.currentLevel)
    setNextLevel(aalResult.data.nextLevel)
  }, [supabase])

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message))
  }, [refresh])

  async function startEnrollment() {
    setBusy(true)
    setError('')
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Life RPG ${new Date().toLocaleDateString()}`,
      })
      if (enrollError) throw enrollError
      setFactorId(data.id)
      setQr(data.totp.qr_code)
      setSecret(data.totp.secret)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось начать настройку 2FA')
    } finally {
      setBusy(false)
    }
  }

  async function verifyEnrollment() {
    if (!factorId || code.trim().length < 6) return
    setBusy(true)
    setError('')
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId })
      if (challenge.error) throw challenge.error
      const verify = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: code.trim() })
      if (verify.error) throw verify.error
      setFactorId('')
      setQr('')
      setSecret('')
      setCode('')
      await refresh()
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Код не принят')
    } finally {
      setBusy(false)
    }
  }

  async function removeFactor(id: string) {
    setBusy(true)
    setError('')
    try {
      const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: id })
      if (removeError) throw removeError
      await supabase.auth.refreshSession()
      await refresh()
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отключить 2FA')
    } finally {
      setBusy(false)
    }
  }

  const verified = factors.filter((factor) => factor.status === 'verified')

  return <div className="form">
    <div className="actions">
      <span className="pill">Текущий уровень: {currentLevel ?? '—'}</span>
      <span className="pill">Доступный: {nextLevel ?? '—'}</span>
    </div>
    {error && <p className="error">{error}</p>}

    {verified.length > 0 ? <>
      <p className="success">2FA включена. Для следующих входов Life RPG потребует код из приложения-аутентификатора.</p>
      {verified.map((factor) => <div className="securityRow" key={factor.id}>
        <div><strong>{factor.friendly_name || 'Authenticator'}</strong><div className="muted">TOTP · verified</div></div>
        <button className="btn" type="button" disabled={busy} onClick={() => removeFactor(factor.id)}>Отключить</button>
      </div>)}
    </> : !qr ? <button className="btn btnPrimary" type="button" disabled={busy} onClick={startEnrollment}>Включить 2FA</button> : <div className="mfaEnroll">
      <p className="muted">Отсканируй QR-код в Google Authenticator, 1Password, Authy или другом TOTP-приложении.</p>
      <img className="mfaQr" src={qr} alt="QR-код для настройки двухфакторной аутентификации" />
      <details><summary>Не сканируется?</summary><code className="secretCode">{secret}</code></details>
      <div className="field"><label>6-значный код</label><input className="input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} /></div>
      <div className="actions"><button className="btn btnPrimary" type="button" disabled={busy || code.length < 6} onClick={verifyEnrollment}>Подтвердить и включить</button><button className="btn" type="button" disabled={busy} onClick={() => { setQr(''); setFactorId(''); setSecret(''); setCode('') }}>Отмена</button></div>
    </div>}
  </div>
}
