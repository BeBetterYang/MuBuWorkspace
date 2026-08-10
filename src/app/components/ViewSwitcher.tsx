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
    <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-[var(--color-surface)] p-0.5 dark:bg-zinc-900">
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
            className={`flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded px-2.5 text-[13px] font-medium transition-colors duration-150 min-[901px]:px-3 ${
              viewMode === item.key
                ? 'bg-[var(--color-charcoal)] text-white dark:bg-white dark:text-black'
                : 'text-[var(--color-steel)] hover:bg-[#efedea] hover:text-[var(--color-ink)] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
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
