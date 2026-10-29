'use client'

import { useEffect, useId, useState } from 'react'

export function ModalForm({
  triggerLabel,
  title,
  eyebrow = 'Новая запись',
  children,
  triggerClassName = 'btn btnPrimary',
}: {
  triggerLabel: string
  title: string
  eyebrow?: string
  children: React.ReactNode
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return <>
    <button className={triggerClassName} type="button" onClick={()=>setOpen(true)}>{triggerLabel}</button>
    {open && <div className="modalBackdrop" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setOpen(false)}}>
      <div className="modalCard" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmitCapture={()=>setOpen(false)}>
        <div className="modalHeader">
          <div><div className="eyebrow">{eyebrow}</div><h2 id={titleId}>{title}</h2></div>
          <button className="modalClose" type="button" onClick={()=>setOpen(false)} aria-label="Закрыть">×</button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>}
  </>
}
