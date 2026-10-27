import type { Metadata, Viewport } from 'next'
import './globals.css'
import { TextareaAutosizeManager } from '@/components/auto-textarea'

export const metadata: Metadata = { title: 'Life RPG v1', description: 'Build your life like a progression game.' }
export const viewport: Viewport = { themeColor: '#17120e' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><TextareaAutosizeManager />{children}</body></html>
}
