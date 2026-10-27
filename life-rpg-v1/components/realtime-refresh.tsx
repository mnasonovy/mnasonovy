'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const tables = [
  'profiles',
  'branches',
  'quests',
  'xp_ledger',
  'daily_templates',
  'daily_instances',
  'daily_instance_items',
] as const

export function RealtimeRefresh({ userId }: { userId: string }) {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`life-rpg-v1:${userId}`)
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => router.refresh(), 120)
    }
    for (const table of tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, refresh)
    }
    channel.subscribe()
    return () => {
      if (timer.current) clearTimeout(timer.current)
      void supabase.removeChannel(channel)
    }
  }, [router, userId])

  return null
}
