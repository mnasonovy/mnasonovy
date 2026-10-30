import type { Metadata, Viewport } from 'next'
import './globals.css'
import './autosize.css'
import './today-fantasy.css'
import './today-polish.css'
import { TextareaAutosizeManager } from '@/components/auto-textarea'

export const metadata: Metadata = {
  title: 'Emberive',
  description: 'Игровая система личного развития: квесты, ветки, арки и прогресс.',
}
export const viewport: Viewport = { themeColor: '#17120e' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><TextareaAutosizeManager />{children}</body></html>
}
