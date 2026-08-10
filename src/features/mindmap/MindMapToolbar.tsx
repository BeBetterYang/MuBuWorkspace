import React from 'react'
import { ChevronRight, GitBranch, LayoutDashboard, Move, Palette, SlidersHorizontal, X } from 'lucide-react'
import type { MindMapAppearance, MindMapLayoutStrategy } from '../../types/document'
import { MindMapAppearancePanel } from './MindMapAppearancePanel'

export type MindMapMode = 'layout' | 'reorganize'

interface MindMapToolbarProps {
  mode: MindMapMode
  focused: boolean
  strategy: MindMapLayoutStrategy
  appearance: MindMapAppearance
  onModeChange: (mode: MindMapMode) => void
  onStrategyChange: (strategy: MindMapLayoutStrategy) => void
  onAutoLayout: () => void
  onAppearanceChange: (appearance: MindMapAppearance) => void
  onResetFocus: () => void
}

export const MindMapToolbar: React.FC<MindMapToolbarProps> = ({
  mode,
  focused,
  strategy,
  appearance,
  onModeChange,
  onStrategyChange,
  onAutoLayout,
  onAppearanceChange,
  onResetFocus,
}) => {
  const [expanded, setExpanded] = React.useState(false)
  const [appearanceOpen, setAppearanceOpen] = React.useState(false)

  if (!expanded) {
    return (
      <div className="mindmap-floating-toolbar safe-floating-top apple-material absolute right-[calc(0.75rem+var(--safe-right))] z-30 rounded-2xl p-1">
        <button
          type="button"
          aria-label="展开导图工具"
          title="展开导图工具"
          onClick={() => setExpanded(true)}
          className="apple-pressable flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-amber-50 hover:text-zinc-800"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="mindmap-floating-toolbar safe-floating-top apple-material absolute right-[calc(0.75rem+var(--safe-right))] z-30 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 overflow-visible rounded-2xl p-1">
      <button
        type="button"
        aria-label="布局"
        title="布局"
        onClick={() => onModeChange('layout')}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
          mode === 'layout' ? 'bg-amber-100 text-amber-900' : 'text-zinc-500 hover:bg-amber-50'
        }`}
      >
        <Move className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="重组"
        title="重组"
        onClick={() => onModeChange('reorganize')}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
          mode === 'reorganize' ? 'bg-emerald-100 text-emerald-800' : 'text-zinc-500 hover:bg-amber-50'
        }`}
      >
        <GitBranch className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="自动整理"
        title="自动整理"
        onClick={onAutoLayout}
        disabled={strategy === 'free-canvas'}
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <LayoutDashboard className="h-4 w-4" />
      </button>
      <select
          aria-label="导图布局策略"
          title="导图布局策略"
          value={strategy}
          onChange={(event) => onStrategyChange(event.target.value as MindMapLayoutStrategy)}
          className="h-8 rounded-md border border-amber-900/10 bg-white px-2 text-xs font-medium text-zinc-600 outline-none transition hover:bg-amber-50 focus:ring-2 focus:ring-amber-200"
        >
          <option value="classic-dagre">经典模式</option>
          <option value="balanced-mindmap">平衡模式</option>
          <option value="free-canvas">自由模式</option>
        </select>
      <button
        type="button"
        aria-label="配色与背景"
        title="配色与背景"
        onClick={() => setAppearanceOpen((open) => !open)}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition ${appearanceOpen ? 'bg-indigo-100 text-indigo-700' : 'text-zinc-500 hover:bg-amber-50'}`}
      >
        <Palette className="h-4 w-4" />
      </button>
      {appearanceOpen && <MindMapAppearancePanel appearance={appearance} onChange={onAppearanceChange} />}
      {focused && (
        <button
          type="button"
          aria-label="回到全图"
          title="回到全图"
          onClick={onResetFocus}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        aria-label="收起导图工具"
        title="收起导图工具"
        onClick={() => { setAppearanceOpen(false); setExpanded(false) }}
        className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-amber-50 hover:text-zinc-700"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
