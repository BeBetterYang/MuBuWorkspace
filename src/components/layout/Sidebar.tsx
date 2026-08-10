import React from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  LockKeyhole,
  Menu,
  MoveRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Search,
  Settings,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useWorkspaceStore } from '../../app/workspaceStore'
import { useDocumentStore } from '../../features/document/documentStore'
import { useServerWorkspaceStore } from '../../features/workspace/serverWorkspaceStore'
import { useSettingsStore } from '../../features/settings/settingsStore'
import type { ServerWorkspaceItem } from '../../services/siweiApi'
import { toast } from '../common/Toast'

export const Sidebar: React.FC = () => {
  const items = useServerWorkspaceStore((state) => state.items)
  const loading = useServerWorkspaceStore((state) => state.loading)
  const loadWorkspace = useServerWorkspaceStore((state) => state.load)
  const createFolder = useServerWorkspaceStore((state) => state.createFolder)
  const createDocument = useServerWorkspaceStore((state) => state.createDocument)
  const removeItem = useServerWorkspaceStore((state) => state.removeItem)
  const updateItem = useServerWorkspaceStore((state) => state.updateItem)
  const duplicateItem = useServerWorkspaceStore((state) => state.duplicateItem)
  const loadDoc = useDocumentStore((state) => state.loadDoc)
  const currentDocumentId = useDocumentStore((state) => state.currentFilePath)
  const canDiscardCurrentDoc = useDocumentStore((state) => state.canDiscardCurrentDoc)
  const setWorkspaceView = useWorkspaceStore((state) => state.setActiveView)
  const activeWorkspaceView = useWorkspaceStore((state) => state.activeView)
  const settings = useSettingsStore((state) => state.settings)
  const updateSettings = useSettingsStore((state) => state.updateSettings)
  const isCollapsed = settings.sidebarCollapsed

  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set())
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(null)
  const [createMenuOpen, setCreateMenuOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const createMenuRef = React.useRef<HTMLDivElement | null>(null)
  const [draft, setDraft] = React.useState<{ type: 'folder' | 'document'; name: string; parentId: string | null } | null>(null)
  const [collapsedRecentOpen, setCollapsedRecentOpen] = React.useState(false)
  const collapsedCloseTimerRef = React.useRef<number | null>(null)
  const [contextMenu, setContextMenu] = React.useState<{ id: string; x: number; y: number } | null>(null)
  const [renameDraft, setRenameDraft] = React.useState<{ id: string; name: string } | null>(null)
  const [moveItemId, setMoveItemId] = React.useState<string | null>(null)

  React.useEffect(() => { void loadWorkspace() }, [loadWorkspace])

  const recentDocuments = React.useMemo(() => items.filter((item) => item.type === 'document').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10), [items])
  const itemById = React.useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const visibleItems = React.useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return items
    const visibleIds = new Set<string>()
    items.forEach((item) => {
      if (!item.name.toLocaleLowerCase().includes(normalized)) return
      visibleIds.add(item.id)
      let parentId = item.parentId
      while (parentId) {
        visibleIds.add(parentId)
        parentId = itemById.get(parentId)?.parentId ?? null
      }
    })
    return items.filter((item) => visibleIds.has(item.id))
  }, [itemById, items, query])
  const itemsByParent = React.useMemo(() => {
    const grouped = new Map<string | null, ServerWorkspaceItem[]>()
    visibleItems.forEach((item) => {
      const siblings = grouped.get(item.parentId) ?? []
      siblings.push(item)
      grouped.set(item.parentId, siblings)
    })
    grouped.forEach((siblings) => siblings.sort((a, b) => (
      a.type === b.type ? b.updatedAt - a.updatedAt : a.type === 'folder' ? -1 : 1
    )))
    return grouped
  }, [visibleItems])

  React.useEffect(() => {
    if (!createMenuOpen) return
    const close = (event: PointerEvent) => {
      if (!createMenuRef.current?.contains(event.target as Node)) setCreateMenuOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [createMenuOpen])

  React.useEffect(() => () => {
    if (collapsedCloseTimerRef.current !== null) window.clearTimeout(collapsedCloseTimerRef.current)
  }, [])

  const keepCollapsedPreviewOpen = () => {
    if (collapsedCloseTimerRef.current !== null) window.clearTimeout(collapsedCloseTimerRef.current)
    collapsedCloseTimerRef.current = null
    setCollapsedRecentOpen(true)
  }

  const scheduleCollapsedPreviewClose = () => {
    if (collapsedCloseTimerRef.current !== null) window.clearTimeout(collapsedCloseTimerRef.current)
    collapsedCloseTimerRef.current = window.setTimeout(() => {
      setCollapsedRecentOpen(false)
      collapsedCloseTimerRef.current = null
    }, 280)
  }

  React.useEffect(() => {
    if (!contextMenu) return
    const close = () => { setContextMenu(null); setMoveItemId(null) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [contextMenu])

  const commitDraft = async () => {
    if (!draft?.name.trim()) return
    try {
      if (draft.type === 'folder') {
        const item = await createFolder(draft.name.trim(), draft.parentId)
        setExpandedIds((ids) => new Set(ids).add(item.parentId || item.id))
      } else {
        const item = await createDocument(draft.name.trim(), draft.parentId)
        await loadDoc(item.id)
        setWorkspaceView('editor')
      }
      setDraft(null)
      setCreateMenuOpen(false)
    } catch (error) {
      toast.error(`创建失败：${String(error)}`)
    }
  }

  const openDocument = async (id: string) => {
    if (id === currentDocumentId || !canDiscardCurrentDoc()) return
    try {
      await loadDoc(id)
      setWorkspaceView('editor')
      if (window.matchMedia?.('(max-width: 1024px)').matches) {
        void updateSettings({ sidebarCollapsed: true })
      }
    } catch (error) {
      toast.error(`文档加载失败：${String(error)}`)
    }
  }

  const commitRename = async () => {
    if (!renameDraft?.name.trim()) return setRenameDraft(null)
    try {
      await updateItem(renameDraft.id, { name: renameDraft.name.trim() })
      setRenameDraft(null)
    } catch (error) {
      toast.error(`重命名失败：${String(error)}`)
    }
  }

  const removeWithConfirmation = async (id: string) => {
    const item = items.find((candidate) => candidate.id === id)
    if (!item || !window.confirm(`确定删除“${item.name}”吗？${item.type === 'folder' ? '文件夹内的内容也会被删除。' : ''}`)) return
    try { await removeItem(id) } catch (error) { toast.error(`删除失败：${String(error)}`) }
  }

  const moveContextItem = async (parentId: string | null) => {
    if (!moveItemId) return
    try { await updateItem(moveItemId, { parentId }); setContextMenu(null); setMoveItemId(null) } catch (error) { toast.error(`移动失败：${String(error)}`) }
  }

  if (isCollapsed) {
    return (
      <aside className="relative h-full w-0 shrink-0 overflow-visible">
        <div className="safe-floating-top absolute left-[calc(0.25rem+var(--safe-left))] z-[90]" onMouseEnter={keepCollapsedPreviewOpen} onMouseLeave={scheduleCollapsedPreviewClose}>
          <button type="button" onClick={() => void updateSettings({ sidebarCollapsed: false })} className="flex h-7 w-7 items-center justify-center rounded bg-transparent text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900" title="展开侧边栏 Ctrl + \">
            {collapsedRecentOpen ? <ChevronRight size={16} /> : <Menu size={16} />}
          </button>
          {collapsedRecentOpen && <div className="absolute left-0 top-9 w-60 pt-2" onMouseEnter={keepCollapsedPreviewOpen} onMouseLeave={scheduleCollapsedPreviewClose}><div className="apple-material rounded-2xl p-3 text-[14px]">
            <div className="mb-2 text-xs text-zinc-500">最近编辑</div>
            <div className="space-y-0.5">{recentDocuments.map((item) => <button key={item.id} type="button" className="flex h-9 w-full items-center rounded-md px-2 text-left text-sm text-[var(--color-slate)] hover:bg-[var(--color-tint-lavender)] hover:text-[var(--color-ink)]" onClick={() => void openDocument(item.id)}><span className="truncate">{item.name}</span></button>)}</div>
          </div></div>}
        </div>
      </aside>
    )
  }

  return (
    <aside className="relative flex h-full w-[270px] shrink-0 flex-col border-r border-[var(--color-hairline)] bg-[var(--color-surface)] pb-[var(--safe-bottom)] pt-[var(--safe-top)] text-[14px] text-[var(--color-charcoal)] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-[90] max-lg:h-[100dvh] max-lg:w-[min(320px,88vw)] max-lg:shadow-[var(--shadow-modal)] lg:pb-0 lg:pt-0">
      <div className="flex h-12 items-center gap-2 px-3">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] text-zinc-600">思</div>
        <span className="text-xs font-medium">?</span><ChevronDown size={13} className="text-zinc-500" />
        <div className="flex-1" />
        <button type="button" onClick={() => void updateSettings({ sidebarCollapsed: true })} className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-white hover:text-zinc-800 dark:hover:bg-zinc-900" title="收起侧栏">
          <ChevronLeft size={14} />
        </button>
      </div>

      <div ref={createMenuRef} className="relative flex items-center gap-2 px-3 pb-3">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-canvas)] px-3 text-[var(--color-stone)] shadow-[var(--shadow-subtle)] focus-within:border-[var(--color-primary)]">
          <Search size={14} className="shrink-0" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="sidebar-search-input min-w-0 flex-1 bg-transparent text-sm text-zinc-700 outline-none" placeholder="搜索文档" aria-label="搜索文档" />
        </label>
        <button type="button" aria-label="新建" onClick={() => setCreateMenuOpen((open) => !open)} className="ui-icon-button ui-icon-button-primary sidebar-create-button h-10 w-10" title="新建文档或文件夹"><Plus size={18} strokeWidth={2.2} /></button>
        {createMenuOpen && <div className="ui-popover absolute right-3 top-12 z-40 w-40 p-1.5"><CreateMenuButton icon={FilePlus2} label="新建文档" onClick={() => { setDraft({ type: 'document', name: '', parentId: selectedFolderId }); setCreateMenuOpen(false) }} /><CreateMenuButton icon={FolderPlus} label="新建文件夹" onClick={() => { setDraft({ type: 'folder', name: '', parentId: selectedFolderId }); setCreateMenuOpen(false) }} /></div>}
      </div>

      <div className="flex items-center justify-between px-3 pb-1.5">
        <button type="button" onClick={() => setSelectedFolderId(null)} className="flex items-center gap-1.5 text-sm font-medium text-zinc-500">
          <ChevronDown size={12} /> 我的文档
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {draft && (
          <div className="mb-1 flex h-8 items-center gap-2 rounded-md bg-white px-2 shadow-sm dark:bg-zinc-900">
            {draft.type === 'folder' && <Folder size={14} className="text-[var(--color-steel)]" />}
            <input autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} onBlur={() => { if (!draft.name.trim()) setDraft(null) }} onKeyDown={(event) => { if (event.key === 'Enter') void commitDraft(); if (event.key === 'Escape') setDraft(null) }} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder={draft.type === 'folder' ? '文件夹名称' : '文档名称'} />
          </div>
        )}
        {loading ? <div className="px-3 py-5 text-sm text-zinc-400">正在加载文档…</div> : (
          <DocumentTree
            itemsByParent={itemsByParent}
            parentId={null}
            depth={0}
            currentDocumentId={currentDocumentId}
            selectedFolderId={selectedFolderId}
            expandedIds={expandedIds}
            onToggle={(id) => setExpandedIds((ids) => { const next = new Set(ids); next.has(id) ? next.delete(id) : next.add(id); return next })}
            onSelectFolder={setSelectedFolderId}
            onOpenDocument={(id) => void openDocument(id)}
            renameDraft={renameDraft}
            onRenameDraftChange={setRenameDraft}
            onCommitRename={() => void commitRename()}
            onOpenMenu={(item, rect) => setContextMenu({ id: item.id, x: Math.min(window.innerWidth - 184, rect.right + 6), y: Math.min(window.innerHeight - 390, rect.top) })}
            onCreateDocument={(folderId) => {
              setSelectedFolderId(folderId)
              setExpandedIds((ids) => new Set(ids).add(folderId))
              setDraft({ type: 'document', name: '', parentId: folderId })
            }}
          />
        )}
      </div>

      {contextMenu && (() => {
        const item = items.find((candidate) => candidate.id === contextMenu.id)
        if (!item) return null
        return <SidebarItemMenu item={item} x={contextMenu.x} y={contextMenu.y} moving={moveItemId === item.id} folders={items.filter((candidate) => candidate.type === 'folder' && candidate.id !== item.id)} onPointerDown={(event) => event.stopPropagation()} onOpen={() => void openDocument(item.id)} onOpenNew={() => window.open(`${window.location.origin}/?document=${encodeURIComponent(item.id)}`, '_blank', 'noopener,noreferrer')} onRename={() => { setRenameDraft({ id: item.id, name: item.name }); setContextMenu(null) }} onToggleMove={() => setMoveItemId(moveItemId === item.id ? null : item.id)} onMove={(parentId) => void moveContextItem(parentId)} onCopy={() => void duplicateItem(item.id).then(() => setContextMenu(null)).catch((error) => toast.error(`复制失败：${String(error)}`))} onShare={() => void navigator.clipboard.writeText(`${window.location.origin}/?document=${encodeURIComponent(item.id)}`).then(() => toast.success('文档链接已复制'))} onDelete={() => { setContextMenu(null); void removeWithConfirmation(item.id) }} />
      })()}

      <div className="border-t border-zinc-200/70 p-2 dark:border-zinc-800">
        <button type="button" onClick={() => setWorkspaceView('settings')} className={`flex h-10 w-full items-center gap-2 rounded-md px-2.5 text-sm ${activeWorkspaceView === 'settings' ? 'bg-[var(--color-tint-lavender)] font-medium text-[var(--color-ink)] dark:bg-zinc-800 dark:text-white' : 'text-[var(--color-slate)] hover:bg-white hover:text-[var(--color-ink)] dark:hover:bg-zinc-900 dark:hover:text-white'}`}>
          <Settings size={15} /> 设置
        </button>
      </div>
    </aside>
  )
}

const CreateMenuButton: React.FC<{ icon: typeof FileText; label: string; onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button type="button" onClick={onClick} className="flex h-10 w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px] text-[var(--color-charcoal)] hover:bg-[var(--color-tint-lavender)] dark:text-zinc-300 dark:hover:bg-zinc-800">
    <Icon size={14} /> {label}
  </button>
)

const SidebarItemMenu: React.FC<{
  item: ServerWorkspaceItem; x: number; y: number; moving: boolean; folders: ServerWorkspaceItem[]
  onPointerDown: React.PointerEventHandler; onOpen: () => void; onOpenNew: () => void; onRename: () => void; onToggleMove: () => void; onMove: (parentId: string | null) => void; onCopy: () => void; onShare: () => void; onDelete: () => void
}> = ({ item, x, y, moving, folders, onPointerDown, onOpen, onOpenNew, onRename, onToggleMove, onMove, onCopy, onShare, onDelete }) => <div className="ui-popover fixed z-[120] w-44 p-1.5 text-sm text-[var(--color-charcoal)]" style={{ left: x, top: y }} onPointerDown={onPointerDown}>
  {item.type === 'document' && <ItemMenuButton icon={ExternalLink} label="在新标签页打开" onClick={onOpenNew} />}
  {item.type === 'document' && <ItemMenuButton icon={FileText} label="打开" onClick={onOpen} />}
  <ItemMenuButton icon={Pencil} label="重命名" onClick={onRename} />
  <ItemMenuButton icon={MoveRight} label="移动到" onClick={onToggleMove} />
  {moving && <div className="ml-2 max-h-36 overflow-y-auto rounded-lg border border-[var(--color-hairline)] bg-[var(--color-surface-soft)] p-1"><button type="button" className="block h-8 w-full rounded-md px-2 text-left text-xs hover:bg-white" onClick={() => onMove(null)}>我的文档</button>{folders.map((folder) => <button key={folder.id} type="button" className="block h-8 w-full truncate rounded-md px-2 text-left text-xs hover:bg-white" onClick={() => onMove(folder.id)}>{folder.name}</button>)}</div>}
  <ItemMenuButton icon={Copy} label="复制" onClick={onCopy} />
  <ItemMenuButton icon={LockKeyhole} label="加密" onClick={() => toast.info('服务器加密功能待管理员配置')} />
  <div className="my-1 border-t border-[var(--color-hairline)]" />
  <ItemMenuButton icon={Share2} label="分享" onClick={onShare} />
  <ItemMenuButton icon={UserPlus} label="邀请协作" onClick={() => toast.info('协作邀请功能待管理员配置')} />
  <div className="my-1 border-t border-[var(--color-hairline)]" />
  <ItemMenuButton icon={Trash2} label="删除" danger onClick={onDelete} />
</div>

const ItemMenuButton: React.FC<{ icon: typeof FileText; label: string; danger?: boolean; onClick: () => void }> = ({ icon: Icon, label, danger, onClick }) => <button type="button" className={`flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm ${danger ? 'text-[var(--color-danger)] hover:bg-[var(--color-tint-red)]' : 'hover:bg-[var(--color-tint-lavender)] hover:text-[var(--color-primary-deep)]'}`} onClick={onClick}><Icon size={15} /><span>{label}</span></button>

const DocumentTree: React.FC<{
  itemsByParent: Map<string | null, ServerWorkspaceItem[]>
  parentId: string | null
  depth: number
  currentDocumentId: string | null
  selectedFolderId: string | null
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onSelectFolder: (id: string) => void
  onOpenDocument: (id: string) => void
  renameDraft: { id: string; name: string } | null
  onRenameDraftChange: (draft: { id: string; name: string } | null) => void
  onCommitRename: () => void
  onOpenMenu: (item: ServerWorkspaceItem, rect: DOMRect) => void
  onCreateDocument: (folderId: string) => void
}> = ({ itemsByParent, parentId, depth, currentDocumentId, selectedFolderId, expandedIds, onToggle, onSelectFolder, onOpenDocument, renameDraft, onRenameDraftChange, onCommitRename, onOpenMenu, onCreateDocument }) => {
  const children = itemsByParent.get(parentId) ?? []
  return <>{children.map((item) => {
    const isFolder = item.type === 'folder'
    const expanded = expandedIds.has(item.id)
    const active = isFolder ? selectedFolderId === item.id : currentDocumentId === item.id
    return (
      <React.Fragment key={item.id}>
        <div className={`sidebar-tree-row group flex h-9 items-center rounded-md pr-1 text-sm transition-colors ${active ? 'bg-[var(--color-tint-lavender)] font-medium text-[var(--color-ink)] dark:bg-zinc-800 dark:text-white' : 'text-[var(--color-slate)] hover:bg-white hover:text-[var(--color-ink)] dark:text-zinc-400 dark:hover:bg-zinc-900'}`} style={{ paddingLeft: 8 + depth * 16 }}>
          <button type="button" onClick={() => isFolder ? onToggle(item.id) : onOpenDocument(item.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
            {isFolder && <ChevronRight size={12} className={`shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />}
            {isFolder && (expanded ? <FolderOpen size={14} className="shrink-0 text-[var(--color-steel)]" /> : <Folder size={14} className="shrink-0 text-[var(--color-steel)]" />)}
            {renameDraft?.id === item.id ? <input autoFocus value={renameDraft.name} aria-label={`重命名 ${item.name}`} className="min-w-0 flex-1 rounded border border-indigo-300 bg-white px-1 outline-none" onClick={(event) => event.stopPropagation()} onChange={(event) => onRenameDraftChange({ id: item.id, name: event.target.value })} onBlur={onCommitRename} onKeyDown={(event) => { if (event.key === 'Enter') onCommitRename(); if (event.key === 'Escape') onRenameDraftChange(null) }} /> : <span className="truncate">{item.name}</span>}
          </button>
          {isFolder && <button type="button" aria-label={`在 ${item.name} 中新建文档`} title="在当前文件夹中新建文档" onClick={(event) => { event.stopPropagation(); onCreateDocument(item.id) }} className="hidden h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200 group-hover:flex"><Plus size={13} /></button>}
          <button type="button" aria-label={`${item.name} 更多操作`} onClick={(event) => { event.stopPropagation(); if (isFolder) onSelectFolder(item.id); onOpenMenu(item, event.currentTarget.getBoundingClientRect()) }} className="hidden h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200 group-hover:flex"><MoreHorizontal size={13} /></button>
        </div>
        {isFolder && expanded && <DocumentTree itemsByParent={itemsByParent} parentId={item.id} depth={depth + 1} currentDocumentId={currentDocumentId} selectedFolderId={selectedFolderId} expandedIds={expandedIds} onToggle={onToggle} onSelectFolder={onSelectFolder} onOpenDocument={onOpenDocument} renameDraft={renameDraft} onRenameDraftChange={onRenameDraftChange} onCommitRename={onCommitRename} onOpenMenu={onOpenMenu} onCreateDocument={onCreateDocument} />}
      </React.Fragment>
    )
  })}</>
}
