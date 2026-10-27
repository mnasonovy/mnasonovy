'use client'

import { useLayoutEffect, useRef, type FormEvent, type TextareaHTMLAttributes } from 'react'

export function AutoTextarea({ className = '', onInput, style, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function resize() {
    const element = ref.current
    if (!element) return
    element.style.height = '0px'
    element.style.height = `${element.scrollHeight}px`
  }

  useLayoutEffect(() => {
    resize()
  }, [props.value, props.defaultValue])

  function handleInput(event: FormEvent<HTMLTextAreaElement>) {
    resize()
    onInput?.(event)
  }

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      className={`${className} autoTextarea`.trim()}
      style={{ ...style, resize: 'none', overflowY: 'hidden' }}
      onInput={handleInput}
    />
  )
}
