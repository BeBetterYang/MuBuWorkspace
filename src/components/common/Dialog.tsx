import React from 'react'
import { X } from 'lucide-react'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children }) => {
  const titleId = React.useId()

  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[var(--color-brand-navy)]/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ui-modal relative w-full max-w-md overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)] p-6 font-sans text-[var(--color-charcoal)] shadow-[var(--shadow-modal)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-hairline-soft)] pb-4">
          <h3 id={titleId} className="text-lg font-semibold leading-7 text-[var(--color-ink)]">{title}</h3>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="ui-icon-button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
