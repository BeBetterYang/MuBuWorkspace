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
      <div className="mindmap-floating-toolbar safe-floating-top ui-popover absolute right-[calc(0.75rem+var(--safe-right))] z-30 p-1">
        <button
          type="button"
          aria-label="展开导图工具"
          title="展开导图工具"
          onClick={() => setExpanded(true)}
          className="ui-icon-button"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="mindmap-floating-toolbar safe-floating-top ui-popover absolute right-[calc(0.75rem+var(--safe-right))] z-30 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 overflow-visible p-1">
      <button
        type="button"
        aria-label="布局"
        title="布局"
        onClick={() => onModeChange('layout')}
        className={`ui-icon-button ${
          mode === 'layout' ? 'bg-[var(--color-tint-lavender)] text-[var(--color-primary-deep)]' : ''
        }`}
      >
        <Move className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="重组"
        title="重组"
        onClick={() => onModeChange('reorganize')}
        className={`ui-icon-button ${
          mode === 'reorganize' ? 'bg-[var(--color-tint-lavender)] text-[var(--color-primary-deep)]' : ''
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
        className="ui-icon-button disabled:cursor-not-allowed disabled:opacity-35"
      >
        <LayoutDashboard className="h-4 w-4" />
      </button>
      <select
          aria-label="导图布局策略"
          title="导图布局策略"
          value={strategy}
          onChange={(event) => onStrategyChange(event.target.value as MindMapLayoutStrategy)}
          className="h-9 rounded-lg border border-[var(--color-hairline-strong)] bg-white px-2.5 text-[13px] font-medium text-[var(--color-charcoal)] outline-none hover:bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
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
        className={`ui-icon-button ${appearanceOpen ? 'bg-[var(--color-tint-lavender)] text-[var(--color-primary-deep)]' : ''}`}
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
          className="ui-icon-button bg-[var(--color-surface)]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        aria-label="收起导图工具"
        title="收起导图工具"
        onClick={() => { setAppearanceOpen(false); setExpanded(false) }}
        className="ui-icon-button"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
