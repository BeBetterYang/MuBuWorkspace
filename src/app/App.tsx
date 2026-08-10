import React from 'react'
import { LogOut } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { Sidebar } from '../components/layout/Sidebar'
import { ToastContainer, toast } from '../components/common/Toast'
import { useDocumentStore } from '../features/document/documentStore'
import { mindMapExportController } from '../features/mindmap/mindMapExportController'
import { useSettingsStore } from '../features/settings/settingsStore'
import {
  downloadDocumentExport,
  previewImportFile,
} from '../services/siweiApi'
import type { ExportFormat, ImportApplyMode, ImportFormat, ImportPreview } from '../types/document'
import { useAsyncOperation } from '../hooks/useAsyncOperation'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { AppHeader } from './components/AppHeader'
import { ExportDialog, ImportDialog, ImportPreviewDialog } from './components/DocumentDialogs'
import { ViewSwitcher } from './components/ViewSwitcher'
import { useAppInitialization } from './hooks/useAppInitialization'
import { useAutoSave } from './hooks/useAutoSave'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useSuppressBrowserContextMenu } from './hooks/useSuppressBrowserContextMenu'
import { useThemeManager } from './hooks/useThemeManager'
import { useServerWorkspaceStore } from '../features/workspace/serverWorkspaceStore'
import { useWorkspaceStore } from './workspaceStore'

const LazyMindMapView = React.lazy(() => import('../features/mindmap/MindMapView').then((module) => ({ default: module.MindMapView })))
const LazyOutlineEditor = React.lazy(() => import('../features/outline/OutlineEditor').then((module) => ({ default: module.OutlineEditor })))
const LazySettingsPage = React.lazy(() => import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const LazyLibraryWorkspace = React.lazy(() => import('../features/library/LibraryWorkspace').then((module) => ({ default: module.LibraryWorkspace })))

export const App: React.FC = () => {
  useAppInitialization()
  useAutoSave()
  useThemeManager()
  useSuppressBrowserContextMenu()

  const currentDoc = useDocumentStore((s) => s.currentDoc)
  const viewMode = useDocumentStore((s) => s.viewMode)
  const canUndo = useDocumentStore((s) => s.canUndo)
  const canRedo = useDocumentStore((s) => s.canRedo)
  const saveStatus = useDocumentStore((s) => s.saveStatus)
  const isDirty = useDocumentStore((s) => s.isDirty)
  const currentFilePath = useDocumentStore((s) => s.currentFilePath)
  const undo = useDocumentStore((s) => s.undo)
  const redo = useDocumentStore((s) => s.redo)
  const applyImportPreview = useDocumentStore((s) => s.applyImportPreview)
  const canDiscardCurrentDoc = useDocumentStore((s) => s.canDiscardCurrentDoc)
  const setViewMode = useDocumentStore((s) => s.setViewMode)
  const selectedNodeId = useDocumentStore((s) => s.selectedNodeId)
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const activeWorkspaceView = useWorkspaceStore((s) => s.activeView)
  const workspaceItems = useServerWorkspaceStore((s) => s.items)
  const useVerticalSplit = useMediaQuery('(max-width: 900px) and (orientation: portrait)')

  const [isImportOpen, setIsImportOpen] = React.useState(false)
  const [isExportOpen, setIsExportOpen] = React.useState(false)
  const [pendingImportPreview, setPendingImportPreview] = React.useState<ImportPreview | null>(null)
  const runImport = useAsyncOperation({ errorPrefix: '导入失败' })
  const runExport = useAsyncOperation({ errorPrefix: '导出失败' })
  const runFocusMode = useAsyncOperation({ errorPrefix: '退出专注模式失败' })

  useGlobalShortcuts()

  const documentPath = React.useMemo(
    () => buildDocumentPath(workspaceItems, currentFilePath, currentDoc?.title),
    [workspaceItems, currentFilePath, currentDoc?.title],
  )

  const isMindMapVisible = activeWorkspaceView === 'editor' && (viewMode === 'mindmap' || viewMode === 'split')
  const handleImport = async (format: ImportFormat) => {
    const file = await chooseImportFile(format)
    if (!file) return
    await runImport(async () => {
      const preview = await previewImportFile(file, format)
      setPendingImportPreview(preview)
      setIsImportOpen(false)
    })
  }

  const handleConfirmImport = async (mode: ImportApplyMode) => {
    if (!pendingImportPreview) return
    if (mode === 'newDocument' && !canDiscardCurrentDoc()) return

    applyImportPreview(pendingImportPreview, { mode })
    await useDocumentStore.getState().saveDoc()
    await useServerWorkspaceStore.getState().load()
    toast.success('导入内容已应用')
    setPendingImportPreview(null)
  }

  const handleExport = async (format: ExportFormat) => {
    if (!currentDoc) return

    await runExport(async () => {
      await downloadDocumentExport(currentDoc, format)
      toast.success(`已导出 ${exportFormatLabel(format)} 文件`)
      setIsExportOpen(false)
    })
  }

  const handleMindMapExport = (format: 'png' | 'pdf') => {
    mindMapExportController.current.exportMindMap?.(format)
    setIsExportOpen(false)
  }

  const exitFocusMode = () => {
    void runFocusMode(() => updateSettings({ focusMode: false }))
  }

  return (
    <div className="app-shell flex w-screen select-none overflow-hidden bg-linen font-sans text-zinc-800 dark:text-zinc-200">
      {!settings.focusMode && !settings.sidebarCollapsed && (
        <button
          type="button"
          aria-label="关闭侧边栏"
          className="fixed inset-0 z-[80] bg-black/10 backdrop-blur-[1px] min-[901px]:hidden"
          onClick={() => void updateSettings({ sidebarCollapsed: true })}
        />
      )}
      {!settings.focusMode && <Sidebar />}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-linen dark:bg-zinc-950">
        {!settings.focusMode && (
          <AppHeader
            sidebarCollapsed={settings.sidebarCollapsed}
            documentPath={documentPath}
            saveStatus={saveStatus}
            isDirty={isDirty}
            viewMode={viewMode}
            canUndo={canUndo}
            canRedo={canRedo}
            onViewModeChange={setViewMode}
            onUndo={undo}
            onRedo={redo}
            onOpenImport={() => setIsImportOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
          />
        )}

        <main className="relative flex-1 overflow-hidden bg-linen dark:bg-zinc-950">
          <div className="flex h-full w-full overflow-hidden">
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeWorkspaceView === 'library' ? (
                  <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 h-full w-full">
                    <React.Suspense fallback={<WorkspaceLoading />}><LazyLibraryWorkspace /></React.Suspense>
                  </motion.div>
                ) : activeWorkspaceView === 'settings' ? (
                  <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 h-full w-full">
                    <React.Suspense fallback={<WorkspaceLoading />}><LazySettingsPage /></React.Suspense>
                  </motion.div>
                ) : (
                  <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 h-full w-full bg-linen dark:bg-zinc-950">
                    {viewMode === 'outline' && <React.Suspense fallback={<WorkspaceLoading />}><LazyOutlineEditor /></React.Suspense>}
                    {viewMode === 'mindmap' && <React.Suspense fallback={<WorkspaceLoading />}><LazyMindMapView /></React.Suspense>}
                    {viewMode === 'split' && (
                      <PanelGroup orientation={useVerticalSplit ? 'vertical' : 'horizontal'}>
                        <Panel defaultSize={50} minSize={20}>
                          <div className="h-full overflow-hidden border-b border-r border-zinc-200/60 dark:border-zinc-800/60">
                            <React.Suspense fallback={<WorkspaceLoading />}><LazyOutlineEditor /></React.Suspense>
                          </div>
                        </Panel>
                        <PanelResizeHandle className="PanelResizeHandle" />
                        <Panel defaultSize={50} minSize={20}>
                          <div className="h-full overflow-hidden bg-[#FDFDFD] dark:bg-[#121212]">
                            <React.Suspense fallback={<WorkspaceLoading />}><LazyMindMapView /></React.Suspense>
                          </div>
                        </Panel>
                      </PanelGroup>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {settings.focusMode && (
        <>
          <div className="safe-floating-top fixed left-1/2 z-40 -translate-x-1/2">
            <ViewSwitcher viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
          <button
            type="button"
            onClick={exitFocusMode}
            data-touch-target="true"
            className="safe-floating-top apple-material apple-pressable fixed right-[calc(0.75rem+var(--safe-right))] z-40 flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:text-zinc-300 dark:hover:text-zinc-100 dark:focus:ring-zinc-700"
            title="退出专注模式"
            aria-label="退出专注模式"
          >
            <LogOut size={15} />
          </button>
        </>
      )}

      <ImportDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />
      <ImportPreviewDialog
        isOpen={Boolean(pendingImportPreview)}
        preview={pendingImportPreview}
        hasSelectedNode={Boolean(selectedNodeId)}
        onClose={() => setPendingImportPreview(null)}
        onConfirm={handleConfirmImport}
      />
      <ExportDialog
        isOpen={isExportOpen}
        isMindMapVisible={isMindMapVisible}
        onClose={() => setIsExportOpen(false)}
        onExport={handleExport}
        onMindMapExport={handleMindMapExport}
      />

      <ToastContainer />
    </div>
  )
}

function chooseImportFile(format: ImportFormat): Promise<File | null> {
  const accept = format === 'json'
    ? '.json,.siwei.json,application/json'
    : format === 'opml'
      ? '.opml,.xml,text/xml'
      : '.md,.markdown,text/markdown,text/plain'
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}

const WorkspaceLoading: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center bg-white text-xs text-zinc-400" aria-busy="true">
    正在载入视图…
  </div>
)

function exportFormatLabel(format: ExportFormat): string {
  switch (format) {
    case 'markdown':
      return 'Markdown'
    case 'opml':
      return 'OPML'
    case 'html':
      return 'HTML'
    case 'text':
      return '纯文本'
    case 'json':
    default:
      return 'JSON'
  }
}

export default App

function buildDocumentPath(
  items: ReturnType<typeof useServerWorkspaceStore.getState>['items'],
  currentDocumentId: string | null,
  fallbackTitle?: string,
): string[] {
  const path = ['我的文档']
  const current = currentDocumentId ? items.find((item) => item.id === currentDocumentId) : null
  if (!current) return fallbackTitle ? [...path, fallbackTitle] : path

  const ancestors: string[] = []
  const visited = new Set<string>()
  let item: (typeof items)[number] | undefined = current ?? undefined
  while (item && !visited.has(item.id)) {
    visited.add(item.id)
    ancestors.unshift(item.name)
    item = item.parentId ? items.find((candidate) => candidate.id === item?.parentId) : undefined
  }
  return [...path, ...ancestors]
}
