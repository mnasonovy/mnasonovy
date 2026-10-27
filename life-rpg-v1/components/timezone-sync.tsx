'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function TimezoneSync({ userId, currentTimezone }: { userId: string; currentTimezone: string }) {
  const router = useRouter()

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!timeZone || timeZone === currentTimezone) return
    const supabase = createClient()
    supabase.from('profiles').update({ timezone: timeZone }).eq('id', userId).then(({ error }) => {
      if (!error) router.refresh()
    })
  }, [currentTimezone, router, userId])

  return null
}
