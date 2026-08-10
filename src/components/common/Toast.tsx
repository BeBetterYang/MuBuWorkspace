import React from 'react'
import { create } from 'zustand'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastState {
  toasts: ToastMessage[]
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Math.random().toString()
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }))
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, 4000)
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().addToast(msg, 'success'),
  error: (msg: string) => useToastStore.getState().addToast(msg, 'error'),
  info: (msg: string) => useToastStore.getState().addToast(msg, 'info'),
}

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div className="fixed bottom-[calc(1.5rem+var(--safe-bottom))] right-[calc(1.5rem+var(--safe-right))] z-50 flex w-[min(360px,calc(100vw-3rem))] max-w-sm flex-col gap-2 pointer-events-none">
      {toasts.map((item) => {
        const icon = {
          success: <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />,
          error: <AlertCircle className="h-5 w-5 text-[var(--color-error)]" />,
          info: <Info className="h-5 w-5 text-[var(--color-primary)]" />,
        }[item.type]

        const bgClass = {
          success: 'border-l-[var(--color-success)]',
          error: 'border-l-[var(--color-error)]',
          info: 'border-l-[var(--color-primary)]',
        }[item.type]

        return (
          <div
            key={item.id}
            className={`ui-toast pointer-events-auto flex items-center gap-3 rounded-xl border border-[var(--color-hairline)] border-l-[3px] bg-white p-4 text-[var(--color-charcoal)] shadow-[var(--shadow-card)] ${bgClass}`}
          >
            <div>{icon}</div>
            <div className="flex-1 text-sm font-medium leading-5">{item.message}</div>
            <button
              onClick={() => removeToast(item.id)}
              aria-label="关闭通知"
              className="ui-icon-button h-7 w-7"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
