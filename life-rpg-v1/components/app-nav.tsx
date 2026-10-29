'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/today', icon: '⌂', label: 'Сегодня' },
  { href: '/quests', icon: '⚔', label: 'Квесты' },
  { href: '/map', icon: '⌘', label: 'Карта' },
  { href: '/progress', icon: '▥', label: 'Прогресс' },
  { href: '/security', icon: '♢', label: 'Защита' },
]

export function AppNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()
  return <nav className={mobile ? 'mobileNav' : 'nav'}>
    {items.map(item=>{
      const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
      return <Link href={item.href} key={item.href} className={active?'isActive':''} aria-current={active?'page':undefined}>
        <span className="navIcon">{item.icon}</span><span>{item.label}</span>
      </Link>
    })}
  </nav>
}
