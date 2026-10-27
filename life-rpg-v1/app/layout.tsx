import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Life RPG v1', description: 'Build your life like a progression game.' }
export const viewport: Viewport = { themeColor: '#17120e' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>
}
