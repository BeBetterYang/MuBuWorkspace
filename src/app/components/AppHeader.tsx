import React from 'react'
import {
  CheckCircle2,
  CircleAlert,
  FileInput,
  FileOutput,
  LoaderCircle,
  Redo2,
  Save,
  Sparkles,
  Undo2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from '../../components/common/Toast'
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
  onSave: () => Promise<boolean>
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
  onSave,
}) => {
  const status = saveStatus === 'saving'
    ? { label: '保存中', icon: LoaderCircle, className: 'text-blue-600', spin: true }
    : saveStatus === 'error'
      ? { label: '保存失败', icon: CircleAlert, className: 'text-rose-600', spin: false }
      : isDirty
        ? { label: '未保存', icon: CircleAlert, className: 'text-amber-600', spin: false }
        : { label: '已保存', icon: CheckCircle2, className: 'text-emerald-600', spin: false }
  const StatusIcon = status.icon

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.16 }}
      className={`z-10 grid h-12 shrink-0 grid-cols-[minmax(120px,1fr)_auto_minmax(250px,1fr)] items-center gap-2 overflow-hidden border-b border-zinc-200/60 bg-white/80 pr-3 backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-900/80 ${sidebarCollapsed ? 'pl-10' : 'pl-3'}`}
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

      <div className="flex min-w-0 items-center justify-end gap-1 overflow-hidden">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="btn-patch-light flex h-8 w-8 items-center justify-center rounded-md focus:outline-none disabled:cursor-not-allowed disabled:opacity-35"
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 size={15} />
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="btn-patch-light flex h-8 w-8 items-center justify-center rounded-md focus:outline-none disabled:cursor-not-allowed disabled:opacity-35"
          title="重做 (Ctrl+Shift+Z)"
        >
          <Redo2 size={15} />
        </button>

        <button
          type="button"
          onClick={onToggleAgent}
          className={`btn-patch-light flex h-8 w-8 items-center justify-center rounded-md focus:outline-none ${
            isAgentOpen ? 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900' : ''
          }`}
          title="文档助理"
        >
          <Sparkles size={15} />
        </button>

        <button
          type="button"
          onClick={onOpenImport}
          className="btn-patch-light flex h-8 w-8 items-center justify-center rounded-md focus:outline-none"
          title="导入"
        >
          <FileInput size={15} />
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          className="btn-patch-light flex h-8 w-8 items-center justify-center rounded-md focus:outline-none"
          title="导出"
        >
          <FileOutput size={15} />
        </button>

        <div className="mx-0.5 h-4 w-px bg-zinc-200" />

        <div className={`flex shrink-0 items-center gap-1 whitespace-nowrap px-0.5 text-[11px] font-medium ${status.className}`} title={status.label}>
          <StatusIcon size={12} className={status.spin ? 'animate-spin' : ''} />
          <span className="hidden min-[1080px]:inline">{status.label}</span>
        </div>

        <button
          type="button"
          onClick={() => void onSave().then((success) => {
            if (success) toast.success('保存成功')
          })}
          className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-blue-600 px-3 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
          title="保存 (Ctrl+S)"
          disabled={saveStatus === 'saving'}
        >
          <Save size={13} />
          <span className="hidden min-[860px]:inline">保存</span>
        </button>
      </div>
    </motion.header>
  )
}
