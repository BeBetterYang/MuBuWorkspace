import React from 'react'
import {
  FileInput,
  FileOutput,
  MoreHorizontal,
  Redo2,
  Undo2,
} from 'lucide-react'
import type { SaveStatus, ViewMode } from '../../features/document/documentStore'
import { ViewSwitcher } from './ViewSwitcher'

interface AppHeaderProps {
  sidebarCollapsed?: boolean
  documentPath: string[]
  saveStatus: SaveStatus
  isDirty: boolean
  viewMode: ViewMode
  canUndo: boolean
  canRedo: boolean
  onViewModeChange: (viewMode: ViewMode) => void
  onUndo: () => void
  onRedo: () => void
  onOpenImport: () => void
  onOpenExport: () => void
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  sidebarCollapsed = false,
  documentPath,
  saveStatus,
  isDirty,
  viewMode,
  canUndo,
  canRedo,
  onViewModeChange,
  onUndo,
  onRedo,
  onOpenImport,
  onOpenExport,
}) => {
  const moreMenuRef = React.useRef<HTMLDivElement>(null)
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false)

  React.useEffect(() => {
    if (!moreMenuOpen) return
    const close = (event: PointerEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) setMoreMenuOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [moreMenuOpen])

  const status = saveStatus === 'saving'
    ? { label: '保存中…', className: 'text-[var(--color-slate)]' }
    : saveStatus === 'error'
      ? { label: '保存失败', className: 'text-[var(--color-danger)]' }
      : isDirty
        ? { label: '未保存', className: 'text-[var(--color-slate)]' }
        : { label: '已保存', className: 'text-[var(--color-steel)]' }

  return (
    <header
      className={`z-[100] grid min-h-[calc(2.75rem+var(--safe-top))] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 overflow-visible border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] pr-[calc(0.75rem+var(--safe-right))] pt-[var(--safe-top)] dark:border-zinc-800 dark:bg-zinc-950 ${sidebarCollapsed ? 'pl-[calc(3.25rem+var(--safe-left))]' : 'pl-4'}`}
    >
      <div className="flex min-w-0 items-center justify-start gap-2 overflow-hidden">
        <div className="min-w-0 cursor-default truncate whitespace-nowrap px-1 text-sm text-zinc-500" title={documentPath.join(' / ')}>
          {documentPath.map((part, index) => (
            <React.Fragment key={`${part}-${index}`}>
              {index > 0 && <span className="mx-1.5 text-zinc-300">/</span>}
              <span className={index === documentPath.length - 1 ? 'font-medium text-zinc-700 dark:text-zinc-200' : ''}>{part}</span>
            </React.Fragment>
          ))}
        </div>
        <span aria-hidden="true" className="shrink-0 text-[var(--color-muted)]">·</span>
        <span className={`shrink-0 whitespace-nowrap text-[11px] ${status.className}`} title={status.label}>{status.label}</span>
      </div>

      <div className="flex min-w-0 items-center justify-center overflow-hidden">
        <ViewSwitcher viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        <div className="header-tool-cluster" aria-label="文档操作">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            data-touch-target="true"
            aria-label="撤销"
            className="header-tool-button disabled:cursor-not-allowed disabled:opacity-30"
            title="撤销 (Ctrl+Z)"
          >
            <Undo2 size={16} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            data-touch-target="true"
            aria-label="重做"
            className="header-tool-button disabled:cursor-not-allowed disabled:opacity-30"
            title="重做 (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} strokeWidth={1.8} />
          </button>

        </div>

        <div ref={moreMenuRef} className="relative z-[210]">
          <button
            type="button"
            data-touch-target="true"
            aria-label="更多"
            aria-expanded={moreMenuOpen}
            className={`header-tool-button ${moreMenuOpen ? 'header-tool-button-active' : ''}`}
            title="更多"
            onClick={() => setMoreMenuOpen((open) => !open)}
          >
            <MoreHorizontal size={18} strokeWidth={1.8} />
          </button>
          {moreMenuOpen && (
            <div className="ui-popover absolute right-0 top-9 z-[220] w-44 p-1.5 [--transform-origin:top_right]">
              <button type="button" className="header-more-menu-item" onClick={() => { setMoreMenuOpen(false); onOpenImport() }}>
                <FileInput size={15} />
                导入文档
              </button>
              <button type="button" className="header-more-menu-item" onClick={() => { setMoreMenuOpen(false); onOpenExport() }}>
                <FileOutput size={15} />
                导出文档
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
