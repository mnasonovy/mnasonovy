import type { Metadata, Viewport } from 'next'
import './globals.css'
import './autosize.css'
import './today-fantasy.css'
import './today-polish.css'
import './scenes/morning.css'
import './scenes/day.css'
import './scenes/evening.css'
import './scenes/night.css'
import './scene-layer.css'
import './reference-today.css'
import { TextareaAutosizeManager } from '@/components/auto-textarea'

export const metadata: Metadata = {
  title: 'Emberive',
  description: 'Игровая система личного развития: квесты, ветки, арки и прогресс.',
}
export const viewport: Viewport = { themeColor: '#17120e' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><TextareaAutosizeManager />{children}</body></html>
}
