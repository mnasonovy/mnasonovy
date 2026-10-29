'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  const [mounted, setMounted] = useState(false)
  const titleId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKey)
    requestAnimationFrame(() => closeButtonRef.current?.focus())

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const modal = open && mounted ? createPortal(
    <div
      className="modalBackdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false)
      }}
    >
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmitCapture={() => setOpen(false)}
      >
        <div className="modalHeader">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="modalClose"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>,
    document.body,
  ) : null

  return <>
    <button className={triggerClassName} type="button" onClick={() => setOpen(true)}>
      {triggerLabel}
    </button>
    {modal}
  </>
}
