import React from 'react'
import { Columns, Grid, List, type LucideIcon } from 'lucide-react'
import type { ViewMode } from '../../features/document/documentStore'

interface ViewSwitcherProps {
  viewMode: ViewMode
  onViewModeChange: (viewMode: ViewMode) => void
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({ viewMode, onViewModeChange }) => {
  const items: Array<{ key: ViewMode; label: string; icon: LucideIcon }> = [
    { key: 'outline', label: '大纲', icon: List },
    { key: 'mindmap', label: '思维导图', icon: Grid },
    { key: 'split', label: '分屏', icon: Columns },
  ]

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-hairline)] bg-[var(--color-surface)] p-1 dark:border-zinc-700 dark:bg-zinc-900">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.key}
            type="button"
            data-touch-target="true"
            aria-label={item.label}
            title={item.label}
            onClick={() => onViewModeChange(item.key)}
            className={`flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[13px] font-medium min-[901px]:px-3 ${
              viewMode === item.key
                ? 'border-black bg-black text-white shadow-sm dark:border-white dark:bg-white dark:text-black'
                : 'border-transparent text-[var(--color-steel)] hover:bg-white hover:text-[var(--color-ink)] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
            }`}
          >
            <Icon size={14} />
            <span className="hidden min-[901px]:inline">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
