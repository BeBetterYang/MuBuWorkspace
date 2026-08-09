import React from 'react'
import {
  Baseline, Bold, Braces, CheckSquare, Code2, Focus, Highlighter, ImagePlus,
  Italic, Link2, List, ListOrdered, Menu, MessageSquareMore, MoreHorizontal,
  Strikethrough, Table2, Trash2, Type, Underline,
} from 'lucide-react'

import type { NodeTextFormat, OutlineNode } from '../../types/document'
import { useDocumentStore } from './documentStore'

const MARK_COLORS = ['#ffffff', '#fff2a8', '#ffd6a5', '#ffc9c9', '#d8f3dc', '#cdeffd', '#ddd6fe', '#e5e7eb']
const TEXT_COLORS = ['#18181b', '#71717a', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0284c7', '#4f46e5', '#9333ea']

function findNode(node: OutlineNode, id: string): OutlineNode | null {
  if (node.id === id) return node
  for (const child of node.children) {
    const found = findNode(child, id)
    if (found) return found
  }
  return null
}

function findParentId(node: OutlineNode, id: string, parentId: string | null = null): string | null | undefined {
  if (node.id === id) return parentId
  for (const child of node.children) {
    const found = findParentId(child, id, node.id)
    if (found !== undefined) return found
  }
  return undefined
}

function getSelectedTextRange(nodeId: string): { start: number; end: number } | null {
  const active = document.activeElement
  if (active instanceof HTMLTextAreaElement && active.dataset.mindmapEditorNodeId === nodeId) {
    const start = active.selectionStart ?? 0
    const end = active.selectionEnd ?? start
    return end > start ? { start, end } : null
  }

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null
  const range = selection.getRangeAt(0)
  const container = (range.commonAncestorContainer instanceof Element
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement)?.closest<HTMLElement>(`[data-mindmap-text-node-id="${nodeId}"]`)
  if (!container) return null
  const prefix = range.cloneRange()
  prefix.selectNodeContents(container)
  prefix.setEnd(range.startContainer, range.startOffset)
  return { start: prefix.toString().length, end: prefix.toString().length + range.toString().length }
}

type ToolbarPanel = 'type' | 'marker' | 'textColor' | 'summary' | 'link' | 'list' | 'more' | null

export const NodeFormattingToolbar: React.FC<{
  nodeId: string
  nodeIds?: string[]
  summaryOwnerId?: string
  onFocusBranch?: (nodeId: string) => void
  onDeleteSelected?: () => void
}> = ({ nodeId, nodeIds = [nodeId], summaryOwnerId, onFocusBranch, onDeleteSelected }) => {
  const currentDoc = useDocumentStore((state) => state.currentDoc)
  const update = useDocumentStore((state) => state.updateNodeFormatting)
  const updateSummary = useDocumentStore((state) => state.updateNodeSummary)
  const setNodeChecked = useDocumentStore((state) => state.setNodeChecked)
  const insertSiblingNode = useDocumentStore((state) => state.insertSiblingNode)
  const insertChildNode = useDocumentStore((state) => state.insertChildNode)
  const indentNode = useDocumentStore((state) => state.indentNode)
  const outdentNode = useDocumentStore((state) => state.outdentNode)
  const moveNode = useDocumentStore((state) => state.moveNode)
  const deleteNode = useDocumentStore((state) => state.deleteNode)
  const [panel, setPanel] = React.useState<ToolbarPanel>(null)
  const [panelLeft, setPanelLeft] = React.useState(24)

  const isSummaryMode = Boolean(summaryOwnerId)
  const selectedIds = React.useMemo(() => isSummaryMode ? [nodeId] : Array.from(new Set(nodeIds.length ? nodeIds : [nodeId])), [isSummaryMode, nodeId, nodeIds])
  const summaryRecordOwner = currentDoc && summaryOwnerId ? findNode(currentDoc.root, summaryOwnerId) : null
  const selectedSummary = summaryRecordOwner?.summary
  const node = isSummaryMode && selectedSummary
    ? { id: `summary:${summaryOwnerId}`, text: selectedSummary.text, note: selectedSummary.note, checked: selectedSummary.checked, format: selectedSummary.format, createdAt: 0, updatedAt: 0, children: [] } as OutlineNode
    : currentDoc ? findNode(currentDoc.root, nodeId) : null
  const rootId = currentDoc?.root.id
  const format = node?.format ?? {}
  const parentIds = currentDoc ? selectedIds.map((id) => findParentId(currentDoc.root, id)) : []
  const canAddSummary = selectedIds.length === 1 || (parentIds.length > 1 && parentIds.every((id) => id !== undefined && id === parentIds[0]))
  const orderedSummaryNodeIds = React.useMemo(() => {
    if (!currentDoc || selectedIds.length <= 1) return selectedIds
    const parentId = findParentId(currentDoc.root, selectedIds[0])
    const parent = parentId ? findNode(currentDoc.root, parentId) : null
    return parent?.children.filter((child) => selectedIds.includes(child.id)).map((child) => child.id) ?? selectedIds
  }, [currentDoc, selectedIds])
  const createdSummaryOwnerId = React.useMemo(() => {
    if (orderedSummaryNodeIds.length <= 1) return nodeId
    return orderedSummaryNodeIds[0] ?? nodeId
  }, [nodeId, orderedSummaryNodeIds])
  const summaryOwner = currentDoc ? findNode(currentDoc.root, createdSummaryOwnerId) : null

  React.useEffect(() => setPanel(null), [nodeId, selectedIds.length])
  if (!node) return null

  const button = (active = false) => `flex h-8 w-8 items-center justify-center rounded-md transition ${active ? 'bg-white/15 text-white' : 'text-zinc-300 hover:bg-white/10 hover:text-white'}`
  const togglePanel = (next: Exclude<ToolbarPanel, null>, event: React.MouseEvent<HTMLButtonElement>) => {
    setPanelLeft(event.currentTarget.offsetLeft + event.currentTarget.offsetWidth / 2)
    setPanel((current) => current === next ? null : next)
  }
  const updateSummaryRecord = (patch: Partial<NonNullable<OutlineNode['summary']>>) => {
    if (!summaryOwnerId || !selectedSummary) return
    updateSummary(summaryOwnerId, { ...selectedSummary, ...patch })
  }
  const updateTargetFormat = (patch: Partial<NodeTextFormat>) => {
    if (isSummaryMode) updateSummaryRecord({ format: { ...selectedSummary?.format, ...patch } })
    else update(nodeId, patch)
  }
  const updateAll = (patch: Partial<NodeTextFormat>) => {
    if (isSummaryMode) updateTargetFormat(patch)
    else selectedIds.forEach((id) => update(id, patch))
  }
  const updateColor = (kind: 'color' | 'backgroundColor', value: string) => {
    const range = selectedIds.length === 1 ? getSelectedTextRange(isSummaryMode ? `summary:${summaryOwnerId}` : nodeId) : null
    if (!range) {
      updateAll({ [kind]: value })
      return
    }
    updateTargetFormat({ textSpans: [...(format.textSpans ?? []), { ...range, [kind]: value }] })
  }
  const toggleTodo = () => {
    const next = node.checked === undefined ? false : undefined
    if (isSummaryMode) updateSummaryRecord({ checked: next })
    else selectedIds.forEach((id) => setNodeChecked(id, next))
  }
  const requestNoteEditing = () => {
    window.dispatchEvent(new CustomEvent(isSummaryMode ? 'siwei:edit-summary-note' : 'siwei:edit-node-note', { detail: isSummaryMode ? { ownerId: summaryOwnerId } : { nodeId } }))
    setPanel(null)
  }
  const openImagePicker = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'; input.multiple = true
    input.onchange = async () => {
      const files = Array.from(input.files ?? [])
      if (files.length === 0) return
      const added = await Promise.all(files.map((file) => new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
        reader.readAsDataURL(file)
      })))
      const existing = format.imageDataUrls ?? (format.imageDataUrl ? [format.imageDataUrl] : [])
      updateTargetFormat({ imageDataUrls: [...existing, ...added.filter(Boolean)], imageDataUrl: undefined })
    }
    input.click()
  }
  return (
    <div className="node-formatting-shell fixed bottom-[calc(0.75rem+var(--safe-bottom))] left-1/2 z-[80] max-w-[calc(100vw-1.5rem)] -translate-x-1/2" onMouseDown={(event) => event.stopPropagation()}>
      {panel && (
        <div className="apple-material absolute bottom-14 min-w-48 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 rounded-2xl p-2 text-zinc-800" style={{ left: panelLeft }}>
          {panel === 'type' && <div className="space-y-2">
            <div className="flex items-center gap-1">{[12, 14, 16, 18, 20, 24].map((size) => <button key={size} type="button" className={`rounded px-2 py-1 text-xs ${format.fontSize === size || !format.fontSize && size === 14 ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-zinc-100'}`} onClick={() => updateAll({ fontSize: size })}>{size}</button>)}</div>
            <div className="flex items-center gap-1 border-t border-zinc-100 pt-2">
              <button type="button" aria-label="加粗" className={`h-8 w-8 rounded ${format.bold ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-zinc-100'}`} onClick={() => updateAll({ bold: !format.bold })}><Bold className="mx-auto h-4 w-4" /></button>
              <button type="button" aria-label="斜体" className={`h-8 w-8 rounded ${format.italic ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-zinc-100'}`} onClick={() => updateAll({ italic: !format.italic })}><Italic className="mx-auto h-4 w-4" /></button>
              <button type="button" aria-label="下划线" className={`h-8 w-8 rounded ${format.underline ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-zinc-100'}`} onClick={() => updateAll({ underline: !format.underline })}><Underline className="mx-auto h-4 w-4" /></button>
              <button type="button" aria-label="删除线" className={`h-8 w-8 rounded ${format.strike ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-zinc-100'}`} onClick={() => updateAll({ strike: !format.strike })}><Strikethrough className="mx-auto h-4 w-4" /></button>
            </div>
          </div>}
          {(panel === 'marker' || panel === 'textColor') && <div className="w-48">
            <div className="mb-2 px-1 text-xs text-zinc-500">{panel === 'marker' ? '标记颜色' : '文字颜色'}</div>
            <div className="grid grid-cols-5 gap-2">{(panel === 'marker' ? MARK_COLORS : TEXT_COLORS).map((color) => <button key={color} type="button" aria-label={color} className="h-7 w-7 rounded-md border border-zinc-200 shadow-sm" style={{ backgroundColor: color }} onMouseDown={(event) => event.preventDefault()} onClick={() => updateColor(panel === 'marker' ? 'backgroundColor' : 'color', color)} />)}</div>
          </div>}
          {panel === 'summary' && <div className="w-72 space-y-2"><div className="text-xs text-zinc-500">概要将以括弧覆盖所选同级节点，并在右侧生成摘要节点。</div><input autoFocus aria-label="概要内容" value={summaryOwner?.summary?.text ?? ''} placeholder="输入概要" className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" onChange={(event) => updateSummary(createdSummaryOwnerId, event.target.value ? { text: event.target.value, nodeIds: orderedSummaryNodeIds } : undefined)} />{summaryOwner?.summary && <button type="button" className="w-full rounded-md py-1.5 text-xs text-rose-600 hover:bg-rose-50" onClick={() => updateSummary(createdSummaryOwnerId, undefined)}>删除概要</button>}</div>}
          {panel === 'link' && <input autoFocus aria-label="节点链接" value={format.link ?? ''} placeholder="粘贴链接地址" className="w-72 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" onChange={(event) => updateTargetFormat({ link: event.target.value || undefined })} />}
          {panel === 'list' && <div className="flex gap-1"><button type="button" className="rounded-lg px-3 py-2 text-sm hover:bg-zinc-100" onClick={() => updateAll({ listStyle: undefined })}><Menu size={15} /></button><button type="button" className="rounded-lg px-3 py-2 text-sm hover:bg-zinc-100" onClick={() => updateAll({ listStyle: 'bullet' })}><List size={15} /></button><button type="button" className="rounded-lg px-3 py-2 text-sm hover:bg-zinc-100" onClick={() => updateAll({ listStyle: 'number' })}><ListOrdered size={15} /></button></div>}
          {panel === 'more' && isSummaryMode && <div className="grid min-w-52 gap-0.5 text-sm"><button type="button" className="rounded-md px-3 py-2 text-left text-rose-600 hover:bg-rose-50" onClick={() => summaryOwnerId && updateSummary(summaryOwnerId, undefined)}>删除概要节点</button></div>}
          {panel === 'more' && !isSummaryMode && <div className="grid min-w-52 gap-0.5 text-sm">
            {nodeId !== rootId && <button type="button" className="rounded-md px-3 py-2 text-left hover:bg-zinc-100" onClick={() => insertSiblingNode(nodeId, '新主题')}>插入同级主题</button>}
            <button type="button" className="rounded-md px-3 py-2 text-left hover:bg-zinc-100" onClick={() => insertChildNode(nodeId, '新主题')}>插入下级主题</button>
            {nodeId !== rootId && <><button type="button" className="rounded-md px-3 py-2 text-left hover:bg-zinc-100" onClick={() => moveNode(nodeId, 'up')}>上移主题</button><button type="button" className="rounded-md px-3 py-2 text-left hover:bg-zinc-100" onClick={() => moveNode(nodeId, 'down')}>下移主题</button><button type="button" className="rounded-md px-3 py-2 text-left hover:bg-zinc-100" onClick={() => indentNode(nodeId)}>降低层级</button><button type="button" className="rounded-md px-3 py-2 text-left hover:bg-zinc-100" onClick={() => outdentNode(nodeId)}>提升层级</button><button type="button" className="rounded-md px-3 py-2 text-left text-rose-600 hover:bg-rose-50" onClick={() => deleteNode(nodeId)}>删除主题</button></>}
          </div>}
        </div>
      )}

      <div className="node-formatting-toolbar flex max-w-[calc(100vw-1.5rem)] items-center gap-0.5 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-[0_14px_38px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        {selectedIds.length > 1 && <span className="px-2 text-xs text-zinc-300">{selectedIds.length} 项</span>}
        <button type="button" title="文字格式" aria-label="文字格式" className={button(panel === 'type')} onClick={(event) => togglePanel('type', event)}><Type size={18} /></button>
        <button type="button" title="标记颜色" aria-label="标记颜色" className={button(panel === 'marker')} onMouseDown={(event) => event.preventDefault()} onClick={(event) => togglePanel('marker', event)}><Highlighter size={17} style={{ color: format.backgroundColor ?? '#fde047' }} /></button>
        <button type="button" title="文字颜色" aria-label="文字颜色" className={button(panel === 'textColor')} onMouseDown={(event) => event.preventDefault()} onClick={(event) => togglePanel('textColor', event)}><Baseline size={17} style={{ color: format.color ?? '#f4f4f5' }} /></button>
        <span className="mx-1 h-5 w-px bg-white/15" />
        <button type="button" title="待办" aria-label="待办" className={button(node.checked !== undefined)} onClick={toggleTodo}><CheckSquare size={18} /></button>
        {!isSummaryMode && <button type="button" title="概要" aria-label="概要" disabled={!canAddSummary} className={`${button(Boolean(summaryOwner?.summary))} disabled:opacity-30`} onClick={(event) => { if (summaryOwner?.summary) updateSummary(createdSummaryOwnerId, { ...summaryOwner.summary, nodeIds: orderedSummaryNodeIds }); togglePanel('summary', event) }}><Braces size={18} /></button>}
        <button type="button" title="编辑描述" aria-label="编辑描述" className={button(Boolean(node.note))} onClick={requestNoteEditing}><MessageSquareMore size={18} /></button>
        <button type="button" title="插入表格" aria-label="插入表格" className={button(Boolean(format.table))} onClick={() => { setPanel(null); if (!format.table) { updateTargetFormat({ table: [['', ''], ['', '']] }); return } if (window.confirm('确定删除当前节点中的表格吗？')) updateTargetFormat({ table: undefined }) }}><Table2 size={18} /></button>
        <button type="button" title="列表样式" aria-label="列表样式" className={button(Boolean(format.listStyle))} onClick={(event) => togglePanel('list', event)}><List size={18} /></button>
        <button type="button" title="插入图片" aria-label="插入图片" className={button(Boolean(format.imageDataUrls?.length || format.imageDataUrl))} onClick={openImagePicker}><ImagePlus size={18} /></button>
        <button type="button" title="链接" aria-label="链接" className={button(Boolean(format.link))} onClick={(event) => togglePanel('link', event)}><Link2 size={18} /></button>
        <button type="button" title="代码" aria-label="代码" className={button(Boolean(format.code))} onClick={() => updateAll({ code: !format.code })}><Code2 size={18} /></button>
        <span className="mx-1 h-5 w-px bg-white/15" />
        {!isSummaryMode && onFocusBranch && selectedIds.length === 1 && <button type="button" title="进入此主题" aria-label="进入此主题" className={button()} onClick={() => onFocusBranch(nodeId)}><Focus size={18} /></button>}
        <button type="button" title="更多" aria-label="更多" className={button(panel === 'more')} onClick={(event) => togglePanel('more', event)}><MoreHorizontal size={19} /></button>
        {(isSummaryMode || nodeId !== rootId) && <button type="button" title={isSummaryMode ? '删除概要节点' : '删除主题'} aria-label={isSummaryMode ? '删除概要节点' : '删除主题'} className={`${button()} hover:!bg-rose-500/20 hover:!text-rose-300`} onClick={() => isSummaryMode ? summaryOwnerId && updateSummary(summaryOwnerId, undefined) : selectedIds.length > 1 ? onDeleteSelected?.() : deleteNode(nodeId)}><Trash2 size={17} /></button>}
      </div>
    </div>
  )
}
