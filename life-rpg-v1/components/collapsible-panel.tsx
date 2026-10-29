'use client'

import { useState } from 'react'

export function CollapsiblePanel({
  title,
  subtitle,
  icon,
  meta,
  action,
  children,
  defaultOpen = true,
}: {
  title: string
  subtitle?: string
  icon?: string
  meta?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return <section className={`foldPanel ${open ? 'isOpen' : ''}`}>
    <div className="foldHeader">
      <button className="foldToggle" type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open}>
        {icon && <span className="foldIcon">{icon}</span>}
        <span className="foldCopy"><strong>{title}</strong>{subtitle && <span>{subtitle}</span>}</span>
      </button>
      <div className="foldTools">
        {meta && <div className="foldMeta">{meta}</div>}
        {action}
        <button className="foldChevron" type="button" onClick={()=>setOpen(value=>!value)} aria-label={open?'Свернуть':'Развернуть'}>{open?'⌃':'⌄'}</button>
      </div>
    </div>
    {open && <div className="foldContent">{children}</div>}
  </section>
}
