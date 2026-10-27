'use client'

import { useEffect } from 'react'

function fitTextarea(element: HTMLTextAreaElement) {
  element.style.height = '0px'
  element.style.height = `${element.scrollHeight}px`
}

export function TextareaAutosizeManager() {
  useEffect(() => {
    const fitAll = () => {
      document.querySelectorAll<HTMLTextAreaElement>('textarea').forEach(fitTextarea)
    }

    const onInput = (event: Event) => {
      if (event.target instanceof HTMLTextAreaElement) fitTextarea(event.target)
    }

    fitAll()
    document.addEventListener('input', onInput, true)

    const observer = new MutationObserver(fitAll)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener('input', onInput, true)
      observer.disconnect()
    }
  }, [])

  return null
}
