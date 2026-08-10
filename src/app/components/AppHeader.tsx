import React from 'react'
import {
  CheckCircle2,
  CircleAlert,
  FileInput,
  FileOutput,
  LoaderCircle,
  Redo2,
  Sparkles,
  Undo2,
} from 'lucide-react'
import { motion } from 'framer-motion'
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
  isAgentOpen: boolean
  onViewModeChange: (viewMode: ViewMode) => void
  onUndo: () => void
  onRedo: () => void
  onToggleAgent: () => void
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
  isAgentOpen,
  onViewModeChange,
  onUndo,
  onRedo,
  onToggleAgent,
  onOpenImport,
  onOpenExport,
}) => {
  const status = saveStatus === 'saving'
    ? { label: '保存中', icon: LoaderCircle, className: 'text-[var(--color-primary)]', spin: true }
    : saveStatus === 'error'
      ? { label: '保存失败', icon: CircleAlert, className: 'text-[var(--color-danger)]', spin: false }
      : isDirty
        ? { label: '未保存', icon: CircleAlert, className: 'text-[var(--color-warning)]', spin: false }
        : { label: '已保存', icon: CheckCircle2, className: 'text-[var(--color-success)]', spin: false }
  const StatusIcon = status.icon

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16 }}
      className={`z-10 grid min-h-[calc(3.75rem+var(--safe-top))] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 overflow-hidden border-b border-[var(--color-hairline)] bg-[var(--color-canvas)] pb-1 pr-[calc(0.75rem+var(--safe-right))] pt-[calc(0.25rem+var(--safe-top))] dark:border-zinc-800 dark:bg-zinc-950 ${sidebarCollapsed ? 'pl-[calc(3.5rem+var(--safe-left))]' : 'pl-4'}`}
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
      </div>

      <div className="flex min-w-0 items-center justify-center overflow-hidden">
        <ViewSwitcher viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2 overflow-hidden">
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

          <span className="header-tool-separator" aria-hidden="true" />

          <button
            type="button"
            onClick={onToggleAgent}
            data-touch-target="true"
            aria-label="文档助理"
            aria-pressed={isAgentOpen}
            className={`header-tool-button ${isAgentOpen ? 'header-tool-button-active' : ''}`}
            title="文档助理"
          >
            <Sparkles size={16} strokeWidth={1.8} />
          </button>

          <span className="header-tool-separator" aria-hidden="true" />

          <button
            type="button"
            onClick={onOpenImport}
            data-touch-target="true"
            aria-label="导入"
            className="header-tool-button"
            title="导入"
          >
            <FileInput size={16} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            data-touch-target="true"
            aria-label="导出"
            className="header-tool-button"
            title="导出"
          >
            <FileOutput size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className={`flex shrink-0 items-center gap-1 whitespace-nowrap px-0.5 text-[11px] font-medium ${status.className}`} title={status.label}>
          <StatusIcon size={12} className={status.spin ? 'animate-spin' : ''} />
          <span className="hidden min-[1080px]:inline">{status.label}</span>
        </div>
      </div>
    </motion.header>
  )
}
