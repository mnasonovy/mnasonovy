'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/today', icon: '⌂', label: 'Сегодня', match: '/today' },
  { href: '/quests', icon: '⚔', label: 'Квесты', match: '/quests' },
  { href: '/map', icon: '✥', label: 'Арки', match: '/map' },
  { href: '/today#rituals', icon: '▣', label: 'Ежедневки' },
  { href: '/progress', icon: '♟', label: 'Персонаж', match: '/progress' },
  { href: '/progress#inventory', icon: '♜', label: 'Инвентарь' },
  { href: '/progress#journal', icon: '▤', label: 'Журнал' },
  { href: '/progress', icon: '▥', label: 'Статистика' },
  { href: '/map', icon: '◫', label: 'Карта' },
  { href: '/security', icon: '⚙', label: 'Настройки', match: '/security' },
]

export function AppNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname()
  return <nav className={mobile ? 'mobileNav' : 'nav'}>
    {items.map((item,index)=>{
      const active = item.match ? (pathname === item.match || pathname.startsWith(`${item.match}/`)) : false
      return <Link href={item.href} key={`${item.href}-${index}`} className={active?'isActive':''} aria-current={active?'page':undefined}>
        <span className="navIcon">{item.icon}</span><span>{item.label}</span>
      </Link>
    })}
  </nav>
}
