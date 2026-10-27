'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function MfaChallenge() {
  const supabase = createClient()
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data, error: factorError }) => {
      if (factorError) {
        setError(factorError.message)
        return
      }
      const factor = data.totp.find((item) => item.status === 'verified')
      if (!factor) {
        window.location.replace('/today')
        return
      }
      setFactorId(factor.id)
    })
  }, [supabase])

  async function verify() {
    if (!factorId || code.length < 6) return
    setBusy(true)
    setError('')
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId })
      if (challenge.error) throw challenge.error
      const result = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code })
      if (result.error) throw result.error
      window.location.replace('/today')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неверный код')
    } finally {
      setBusy(false)
    }
  }

  return <div className="form">
    {error && <p className="error">{error}</p>}
    <div className="field"><label>Код из приложения-аутентификатора</label><input className="input" autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} /></div>
    <button className="btn btnPrimary" type="button" onClick={verify} disabled={busy || !factorId || code.length < 6}>{busy ? 'Проверяю…' : 'Продолжить'}</button>
  </div>
}
