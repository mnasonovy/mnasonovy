'use client'

export function SceneAdmireButton() {
  return <button
    type="button"
    className="sceneAdmireButton"
    onClick={() => window.dispatchEvent(new CustomEvent('emberive:admire'))}
  >
    <span aria-hidden="true">⌁</span>
    Полюбоваться сценой
  </button>
}
