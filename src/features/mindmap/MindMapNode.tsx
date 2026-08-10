import React from 'react'
import { createPortal } from 'react-dom'
import { Braces, ChevronLeft, Copy, MoreHorizontal, PanelBottomOpen, PanelLeftOpen, PanelRightOpen, PanelTopOpen, Plus, Scissors, Trash2, X } from 'lucide-react'
import { Handle, NodeProps, Position } from 'reactflow'
import { MindMapInlineEditor } from './MindMapInlineEditor'
import { OutlineInlineContent } from '../outline/OutlineInlineContent'
import type { NodeSummary, NodeTextFormat } from '../../types/document'
import { useDocumentStore } from '../document/documentStore'
import type { MindMapTheme } from './mindMapThemes'

export interface MindMapNodeData {
  label: string
  depth: number
  childCount: number
  visibleChildCount: number
  collapsed: boolean
  focused: boolean
  matched: boolean
  activeMatch: boolean
  hasTags: boolean
  note?: string
  summary?: NodeSummary
  summaryOwnerId?: string
  summarySelected?: boolean
  summaryTop?: number
  summaryHeight?: number
  summarySide?: 'left' | 'right'
  checked?: boolean
  exportClean?: boolean
  dropState?: 'before' | 'child' | 'after' | null
  invalidDrop?: boolean
  editing: boolean
  format?: NodeTextFormat
  theme?: MindMapTheme
  onStartEditing: (nodeId: string) => void
  onSelectNode: (nodeId: string, additive: boolean) => void
  leftBranchCollapsed?: boolean
  rightBranchCollapsed?: boolean
  onToggleBranchSide?: (nodeId: string, side: 'left' | 'right') => void
  onToggleCollapse: (nodeId: string) => void
  onTextChange: (nodeId: string, text: string) => void
  onCommitEdit: (nodeId: string) => void
  onCancelEdit: () => void
  onDeleteEmpty: (nodeId: string) => void
  onInsertSibling: (nodeId: string) => void
  onInsertChild: (nodeId: string) => void
  onIndent: (nodeId: string) => void
  onOutdent: (nodeId: string) => void
  onMoveUp: (nodeId: string) => void
  onMoveDown: (nodeId: string) => void
}

const hiddenHandleStyle = { background: '#18181B', border: 'none', width: 5, height: 5, opacity: 0, pointerEvents: 'none' as const }

function renderFormattedText(text: string, format?: NodeTextFormat) {
  const spans = format?.textSpans?.filter((span) => span.end > span.start) ?? []
  if (spans.length === 0) return <OutlineInlineContent text={text} />
  const boundaries = Array.from(new Set([0, text.length, ...spans.flatMap((span) => [
    Math.max(0, Math.min(text.length, span.start)),
    Math.max(0, Math.min(text.length, span.end)),
  ])])).sort((left, right) => left - right)

  return <>{boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1]
    const active = spans.filter((span) => span.start <= start && span.end >= end)
    const style = active.reduce<React.CSSProperties>((result, span) => ({
      ...result,
      color: span.color ?? result.color,
      backgroundColor: span.backgroundColor ?? result.backgroundColor,
    }), {})
    return <span key={`${start}-${end}`} style={style}><OutlineInlineContent text={text.slice(start, end)} /></span>
  })}</>
}

const MindMapNodeComponent: React.FC<NodeProps<MindMapNodeData>> = ({ id, data, selected, type }) => {
  const setNodeChecked = useDocumentStore((state) => state.setNodeChecked)
  const updateNodeFormatting = useDocumentStore((state) => state.updateNodeFormatting)
  const updateNodeNote = useDocumentStore((state) => state.updateNodeNote)
  const editTimerRef = React.useRef<number | null>(null)
  const [previewImage, setPreviewImage] = React.useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null)
  const [imageMenu, setImageMenu] = React.useState<number | null>(null)
  const [editingNote, setEditingNote] = React.useState(false)
  const [noteDraft, setNoteDraft] = React.useState(data.note ?? '')
  const isRoot = type === 'root'
  const hasChildren = data.childCount > 0
  const visualDepth = Math.min(data.depth, 3)
  const imageUrls = data.format?.imageDataUrls ?? (data.format?.imageDataUrl ? [data.format.imageDataUrl] : [])
  const closeImagePreview = () => {
    setPreviewImage(null)
    setSelectedImageIndex(null)
    setImageMenu(null)
  }
  React.useEffect(() => setNoteDraft(data.note ?? ''), [data.note])
  React.useEffect(() => {
    const handleEditNote = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId?: string }>).detail
      if (detail?.nodeId !== id) return
      setNoteDraft(data.note ?? '')
      setEditingNote(true)
    }
    window.addEventListener('siwei:edit-node-note', handleEditNote)
    return () => window.removeEventListener('siwei:edit-node-note', handleEditNote)
  }, [data.note, id])
  const nodeSpacing = isRoot
    ? 'rounded-md border-[1.5px] px-3 py-2'
    : visualDepth === 1
      ? 'rounded-md border-[1.5px] px-3 py-2'
      : 'rounded-lg border-[1.5px] px-1.5 py-1'
  const idleSurface = isRoot
    ? 'border-transparent bg-[var(--color-primary)] shadow-[0_3px_10px_rgba(0,0,0,0.16)] hover:border-[var(--color-primary)]'
    : 'border-transparent bg-transparent hover:border-[var(--color-primary)]'
  const themeBackground = isRoot
    ? data.theme?.rootBackground
    : 'transparent'
  const themeText = isRoot ? data.theme?.rootText : data.theme?.text

  React.useEffect(() => () => {
    if (editTimerRef.current !== null) window.clearTimeout(editTimerRef.current)
  }, [])

  const requestEditing = () => {
    if (data.exportClean || editTimerRef.current !== null) return
    editTimerRef.current = window.setTimeout(() => {
      editTimerRef.current = null
      data.onStartEditing(id)
    }, 0)
  }

  return (
    <div
      data-testid={`mindmap-node-${id}`}
      className={`group relative w-max min-w-[44px] max-w-[580px] text-left transition-[border-color,background-color,box-shadow] duration-150 ${nodeSpacing} ${
        data.activeMatch && !data.exportClean
          ? 'scale-[1.03] border-transparent bg-sky-50 ring-2 ring-sky-500/60'
        : data.editing && !data.exportClean
          ? 'border-[var(--color-primary)] bg-transparent shadow-[0_4px_12px_rgba(0,0,0,0.10)]'
        : selected && !data.exportClean
          ? `${isRoot ? 'bg-[var(--color-primary)]' : 'bg-transparent'} border-[var(--color-primary)] shadow-[0_3px_10px_rgba(0,0,0,0.08)]`
        : data.matched && !data.exportClean
          ? 'border-transparent bg-sky-50 ring-2 ring-sky-300/60'
        : data.focused
          ? 'border-transparent bg-transparent ring-2 ring-zinc-400/50'
        : data.invalidDrop
          ? 'border-transparent bg-rose-50 ring-2 ring-rose-400/50'
        : data.dropState === 'child'
          ? 'scale-[1.02] border-transparent bg-emerald-50 ring-2 ring-emerald-500/60'
          : idleSurface
      }`}
      style={{ backgroundColor: data.format?.backgroundColor ?? themeBackground, color: data.format?.color ?? themeText }}
      onClick={(event) => {
        if (!data.exportClean) data.onSelectNode(id, event.ctrlKey || event.metaKey)
        // React Flow can suppress dblclick while canvas interaction is locked,
        // but the second click still carries detail=2.
        if (event.detail === 2) requestEditing()
      }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        // Let the second click finish focusing the flow node before mounting
        // the textarea, or the new editor is blurred again immediately.
        requestEditing()
      }}
    >
      {data.dropState === 'before' && <div className="absolute -top-2 left-2 right-2 h-0.5 rounded bg-emerald-600" />}
      {data.dropState === 'after' && <div className="absolute -bottom-2 left-2 right-2 h-0.5 rounded bg-emerald-600" />}
      {data.invalidDrop && <div className="absolute -top-2 left-2 right-2 h-0.5 rounded bg-rose-500" />}
      <Handle id="left-target" type="target" position={Position.Left} style={hiddenHandleStyle} isConnectable={false} />
      <Handle
        id="left-source"
        type="source"
        position={Position.Left}
        style={hiddenHandleStyle}
        isConnectable={false}
      />
      <Handle
        id="right-target"
        type="target"
        position={Position.Right}
        style={hiddenHandleStyle}
        isConnectable={false}
      />
      <Handle
        id="right-source"
        type="source"
        position={Position.Right}
        style={hiddenHandleStyle}
        isConnectable={false}
      />
      <Handle id="top-target" type="target" position={Position.Top} style={hiddenHandleStyle} isConnectable={false} />
      <Handle id="top-source" type="source" position={Position.Top} style={hiddenHandleStyle} isConnectable={false} />
      <Handle id="bottom-target" type="target" position={Position.Bottom} style={hiddenHandleStyle} isConnectable={false} />
      <Handle id="bottom-source" type="source" position={Position.Bottom} style={hiddenHandleStyle} isConnectable={false} />

      <div className="flex items-center">
        <div className="min-w-0 flex-1">
          <div>
          {data.editing ? (
            <MindMapInlineEditor
              nodeId={id}
              value={data.label}
              format={data.format}
              themeColor={themeText}
              onChange={(value) => data.onTextChange(id, value)}
              onCommit={() => data.onCommitEdit(id)}
              onCancel={data.onCancelEdit}
              onDeleteEmpty={() => data.onDeleteEmpty(id)}
              onIndent={() => data.onIndent(id)}
              onOutdent={() => data.onOutdent(id)}
              onMoveUp={() => data.onMoveUp(id)}
              onMoveDown={() => data.onMoveDown(id)}
            />
          ) : (
              <div className="flex items-start gap-1.5" onClick={(event) => { event.stopPropagation(); const additive = event.ctrlKey || event.metaKey; data.onSelectNode(id, additive); if (!additive) requestEditing() }}>
                {data.checked !== undefined && !data.exportClean && <button type="button" aria-label={data.checked ? '标记为未完成' : '标记为已完成'} className={`nodrag nopan mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border text-[9px] ${data.checked ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-zinc-400 bg-white'}`} onClick={(event) => { event.stopPropagation(); setNodeChecked(id, !data.checked) }}>{data.checked ? '✓' : ''}</button>}
                <div data-mindmap-text-node-id={id} style={{ color: data.checked ? '#a1a1aa' : data.format?.color ?? themeText, fontSize: data.format?.fontSize, fontWeight: data.format?.bold ? 700 : undefined, fontStyle: data.format?.italic ? 'italic' : undefined, textDecoration: [data.format?.underline && 'underline', (data.format?.strike || data.checked) && 'line-through'].filter(Boolean).join(' ') || undefined }} className={`whitespace-pre-wrap break-words text-sm leading-[1.45] ${data.format?.code ? 'rounded bg-zinc-100 px-1.5 py-1 font-mono' : ''} ${
                visualDepth === 0
                      ? 'text-base font-bold text-white'
                      : visualDepth === 1
                        ? 'text-base font-normal text-zinc-900'
                        : 'font-normal text-zinc-700'
              }`}>
                {data.format?.listStyle === 'bullet' && <span className="mr-1.5 text-indigo-500">•</span>}
                {data.format?.listStyle === 'number' && <span className="mr-1.5 text-indigo-500">1.</span>}
                {data.label ? (
                  data.format?.link ? <a href={data.format.link} target="_blank" rel="noreferrer" className="underline underline-offset-2" onClick={(event) => event.stopPropagation()}>{renderFormattedText(data.label, data.format)}</a> : renderFormattedText(data.label, data.format)
                ) : (
                  <span className="font-normal italic text-zinc-400">空白节点</span>
                )}
                </div>
              </div>
          )}
              {editingNote ? <textarea autoFocus aria-label="节点描述" value={noteDraft} placeholder="输入节点描述，Enter 完成" rows={1} className="mindmap-inline-editor nodrag nopan mt-0.5 block h-auto min-h-7 w-full min-w-44 max-w-[320px] resize-none overflow-hidden whitespace-pre-wrap border-0 bg-transparent px-0 py-1 text-[11px] font-normal leading-relaxed text-zinc-600 shadow-none outline-none [field-sizing:content] focus:outline-none focus:ring-0 focus-visible:outline-none" onClick={(event) => event.stopPropagation()} onChange={(event) => setNoteDraft(event.target.value)} onBlur={() => { updateNodeNote(id, noteDraft); setEditingNote(false) }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); updateNodeNote(id, noteDraft); setEditingNote(false) } if (event.key === 'Escape') { event.preventDefault(); setNoteDraft(data.note ?? ''); setEditingNote(false) } }} /> : data.note && <button type="button" className="nodrag nopan mt-0.5 block min-h-7 w-full min-w-44 max-w-[320px] whitespace-pre-wrap border-l-2 border-indigo-300 py-1 pl-2 pr-2 text-left text-[11px] font-normal leading-relaxed text-zinc-500" onClick={(event) => { event.stopPropagation(); setNoteDraft(data.note ?? ''); setEditingNote(true) }}>{data.note}</button>}
              {data.format?.table && <EditableNodeTable table={data.format.table} onChange={(table) => updateNodeFormatting(id, { table })} />}
              {imageUrls.length > 0 && <div className="nodrag nopan relative mt-2 block w-full max-w-[240px]" onClick={(event) => event.stopPropagation()}>
                <div className={`grid gap-2 ${imageUrls.length === 1 ? 'grid-cols-1' : imageUrls.length < 3 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {imageUrls.map((src, index) => <div key={`${src.slice(0, 24)}-${index}`} className="group/image relative">
                    <button type="button" className={`${imageUrls.length === 1 ? 'block w-full max-w-full' : 'aspect-square w-full min-w-0'} overflow-hidden rounded-md bg-zinc-100 transition ${selectedImageIndex === index ? 'ring-2 ring-indigo-500 ring-offset-1' : 'hover:ring-1 hover:ring-indigo-300'}`} onClick={(event) => { event.stopPropagation(); setSelectedImageIndex(index); setPreviewImage(src) }} onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); setSelectedImageIndex(index); setImageMenu(index) }}><img src={src} alt={`节点图片 ${index + 1}`} className={imageUrls.length === 1 ? 'block h-auto max-h-[180px] w-full max-w-full object-contain' : 'h-full w-full object-cover'} /></button>
                    <button type="button" aria-label={`打开第 ${index + 1} 张图片操作`} className={`absolute right-1 top-1 flex h-4 w-6 items-center justify-center rounded-full bg-zinc-600/90 text-white shadow-sm transition hover:bg-zinc-800 ${selectedImageIndex === index ? 'opacity-100' : 'opacity-0 group-hover/image:opacity-100'}`} style={{ transform: 'scale(var(--mindmap-inverse-zoom, 1))', transformOrigin: 'top right' }} onClick={(event) => { event.stopPropagation(); setSelectedImageIndex(index); setImageMenu(imageMenu === index ? null : index) }}><MoreHorizontal size={13} /></button>
                    {imageMenu === index && <div className="absolute left-full top-0 z-[80] ml-2 w-24 rounded-lg border border-zinc-200 bg-white p-1 text-xs text-zinc-700 shadow-xl" style={{ transform: 'scale(var(--mindmap-inverse-zoom, 1))', transformOrigin: 'top left' }} onMouseLeave={() => setImageMenu(null)}>
                      <ImageMenuButton icon={<Copy size={14} />} label="复制" onClick={() => { void copyImage(src); setImageMenu(null) }} />
                      <ImageMenuButton icon={<Scissors size={14} />} label="剪切" onClick={() => void copyImage(src).finally(() => { updateNodeFormatting(id, { imageDataUrls: imageUrls.filter((_, itemIndex) => itemIndex !== index), imageDataUrl: undefined }); setSelectedImageIndex(null); setImageMenu(null) })} />
                      <ImageMenuButton icon={<Trash2 size={14} />} label="删除" danger onClick={() => { updateNodeFormatting(id, { imageDataUrls: imageUrls.filter((_, itemIndex) => itemIndex !== index), imageDataUrl: undefined }); setSelectedImageIndex(null); setImageMenu(null) }} />
                    </div>}
                  </div>)}
                </div>
              </div>}
              {data.hasTags && !data.exportClean && (
                <div className="mt-1 text-[10px] font-medium text-amber-800/55">含标签</div>
              )}
            </div>
        </div>

      </div>

      {!data.exportClean && data.collapsed && hasChildren && (
        <button
          type="button"
          aria-label={`展开节点，${data.childCount} 个子节点`}
          title={`展开 ${data.childCount} 个子节点`}
          className="nodrag nopan absolute left-full top-1/2 z-10 ml-1.5 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-full border border-indigo-500 bg-white px-1 text-[9px] font-bold leading-none text-indigo-600 shadow-sm transition hover:scale-105 hover:bg-indigo-50"
          onClick={(event) => {
            event.stopPropagation()
            data.onToggleCollapse(id)
          }}
        >
          {data.childCount}
        </button>
      )}

      {!data.exportClean && !data.collapsed && (
        <button
          type="button"
          aria-label={hasChildren ? '收起子节点' : '增加子节点'}
          title={hasChildren ? '收起子节点' : '增加子节点'}
          className="nodrag nopan absolute left-full top-1/2 z-10 ml-1.5 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-indigo-400 bg-white text-indigo-600 opacity-0 shadow-sm transition hover:scale-105 hover:border-indigo-600 hover:bg-indigo-50 group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={(event) => {
            event.stopPropagation()
            if (hasChildren) data.onToggleCollapse(id)
            else data.onInsertChild(id)
          }}
        >
          {hasChildren ? <ChevronLeft className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </button>
      )}

      {!data.exportClean && data.summary && data.summaryOwnerId && <MindMapSummary ownerId={data.summaryOwnerId} summary={data.summary} selected={Boolean(data.summarySelected)} top={data.summaryTop} height={data.summaryHeight} side={data.summarySide} theme={data.theme} />}

      {previewImage && createPortal(<div className="nodrag nopan fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-8" onClick={(event) => { event.stopPropagation(); closeImagePreview() }}><button type="button" aria-label="关闭大图" className="absolute right-6 top-6 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25" onClick={(event) => { event.stopPropagation(); closeImagePreview() }}><X size={22} /></button><img src={previewImage} alt="图片大图预览" className="max-h-full max-w-full object-contain" onClick={(event) => event.stopPropagation()} /></div>, document.body)}
    </div>
  )
}

const ImageMenuButton: React.FC<{ icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }> = ({ icon, label, danger, onClick }) => <button type="button" className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-zinc-100 ${danger ? 'text-rose-600' : ''}`} onClick={(event) => { event.stopPropagation(); onClick() }}>{icon}{label}</button>

const MindMapSummary: React.FC<{ ownerId: string; summary: NodeSummary; selected: boolean; top?: number; height?: number; side?: 'left' | 'right'; theme?: MindMapTheme }> = ({ ownerId, summary, selected, top = -4, height = 44, side = 'right', theme }) => {
  const updateNodeSummary = useDocumentStore((state) => state.updateNodeSummary)
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(summary.text)
  const [editingNote, setEditingNote] = React.useState(false)
  const [noteDraft, setNoteDraft] = React.useState(summary.note ?? '')
  const [previewImage, setPreviewImage] = React.useState<string | null>(null)
  const [imageMenu, setImageMenu] = React.useState<number | null>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const imageUrls = summary.format?.imageDataUrls ?? (summary.format?.imageDataUrl ? [summary.format.imageDataUrl] : [])
  const updateSummary = (patch: Partial<NodeSummary>) => updateNodeSummary(ownerId, { ...summary, ...patch })
  const updateFormat = (patch: Partial<NodeTextFormat>) => updateSummary({ format: { ...summary.format, ...patch } })
  React.useEffect(() => {
    if (!editing) setDraft(summary.text)
  }, [editing, summary.text])
  React.useEffect(() => setNoteDraft(summary.note ?? ''), [summary.note])
  React.useEffect(() => {
    if (!editing) return
    const input = inputRef.current
    input?.focus({ preventScroll: true })
    input?.setSelectionRange(input.value.length, input.value.length)
  }, [editing])
  React.useEffect(() => {
    const editSummaryNote = (event: Event) => {
      if ((event as CustomEvent<{ ownerId?: string }>).detail?.ownerId !== ownerId) return
      setNoteDraft(summary.note ?? '')
      setEditingNote(true)
    }
    window.addEventListener('siwei:edit-summary-note', editSummaryNote)
    return () => window.removeEventListener('siwei:edit-summary-note', editSummaryNote)
  }, [ownerId, summary.note])
  const commit = () => {
    updateNodeSummary(ownerId, draft.trim() ? { ...summary, text: draft } : undefined)
    setEditing(false)
  }
  const selectSummary = (event: React.SyntheticEvent) => {
    event.stopPropagation()
    window.dispatchEvent(new CustomEvent('siwei:select-summary', { detail: { ownerId } }))
  }
  const isLeft = side === 'left'
  return <div data-testid={`mindmap-summary-${ownerId}`} data-summary-side={side} className={`pointer-events-none absolute z-20 ${isLeft ? 'right-full mr-6' : 'left-full ml-6'}`} style={{ top, height: Math.max(1, height), width: 280 }}>
    <Braces aria-hidden="true" viewBox={isLeft ? '3 3 5 18' : '16 3 5 18'} preserveAspectRatio="none" className={`mindmap-summary-brace absolute top-0 h-full w-3 ${isLeft ? 'right-0' : 'left-0'}`} style={{ color: theme?.text, stroke: theme?.text }} strokeWidth={1.25} />
    <div role="button" tabIndex={0} aria-label={`概要节点 ${summary.text}`} className={`nodrag nopan pointer-events-auto absolute top-1/2 w-max min-w-16 max-w-[580px] -translate-y-1/2 rounded-lg border-[1.5px] bg-transparent px-3 py-2 text-left shadow-sm transition ${isLeft ? 'right-5' : 'left-5'} ${selected ? 'ring-2 ring-indigo-100' : 'hover:opacity-80'}`} style={{ backgroundColor: summary.format?.backgroundColor ?? 'transparent', borderColor: theme?.text, color: summary.format?.color ?? theme?.text }} onClick={selectSummary} onDoubleClick={(event) => { selectSummary(event); setEditing(true) }}>
      {editing ? <textarea ref={inputRef} data-mindmap-editor-node-id={`summary:${ownerId}`} aria-label="编辑概要节点" value={draft} rows={1} className="block min-h-5 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-sm leading-snug outline-none [field-sizing:content]" onChange={(event) => setDraft(event.target.value)} onBlur={commit} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); commit() } if (event.key === 'Escape') { event.preventDefault(); setDraft(summary.text); setEditing(false) } }} /> : <div className="flex items-start gap-1.5">
        {summary.checked !== undefined && <button type="button" aria-label={summary.checked ? '概要标记为未完成' : '概要标记为已完成'} className={`mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border text-[9px] ${summary.checked ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-zinc-400 bg-white'}`} onClick={(event) => { event.stopPropagation(); updateSummary({ checked: !summary.checked }) }}>{summary.checked ? '✓' : ''}</button>}
        <div data-mindmap-text-node-id={`summary:${ownerId}`} className="whitespace-pre-wrap break-words text-sm leading-[1.45]" style={{ color: summary.checked ? '#a1a1aa' : summary.format?.color, fontSize: summary.format?.fontSize, fontWeight: summary.format?.bold ? 700 : undefined, fontStyle: summary.format?.italic ? 'italic' : undefined, textDecoration: [summary.format?.underline && 'underline', (summary.format?.strike || summary.checked) && 'line-through'].filter(Boolean).join(' ') || undefined }}>{summary.format?.link ? <a href={summary.format.link} target="_blank" rel="noreferrer" className="underline underline-offset-2" onClick={(event) => event.stopPropagation()}>{renderFormattedText(summary.text, summary.format)}</a> : renderFormattedText(summary.text, summary.format)}</div>
      </div>}
      {editingNote ? <textarea autoFocus aria-label="概要描述" value={noteDraft} rows={1} className="mindmap-inline-editor mt-0.5 block min-h-7 w-full resize-none overflow-hidden whitespace-pre-wrap border-0 bg-transparent px-0 py-1 text-[11px] leading-relaxed text-zinc-500 shadow-none outline-none [field-sizing:content] focus:outline-none focus:ring-0 focus-visible:outline-none" onClick={(event) => event.stopPropagation()} onChange={(event) => setNoteDraft(event.target.value)} onBlur={() => { updateSummary({ note: noteDraft }); setEditingNote(false) }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); updateSummary({ note: noteDraft }); setEditingNote(false) } }} /> : summary.note && <button type="button" className="mt-0.5 block min-h-7 w-full whitespace-pre-wrap border-l-2 border-indigo-300 py-1 pl-2 pr-2 text-left text-[11px] text-zinc-500" onClick={(event) => { event.stopPropagation(); setEditingNote(true) }}>{summary.note}</button>}
      {summary.format?.table && <EditableNodeTable table={summary.format.table} onChange={(table) => updateFormat({ table })} />}
      {imageUrls.length > 0 && <div className="relative mt-2 block w-full max-w-[216px]" onClick={(event) => event.stopPropagation()}><div className={`grid gap-2 ${imageUrls.length === 1 ? 'grid-cols-1' : imageUrls.length < 3 ? 'grid-cols-2' : 'grid-cols-3'}`}>{imageUrls.map((src, index) => <div key={`${src.slice(0, 24)}-${index}`} className="group/image relative"><button type="button" className={`${imageUrls.length === 1 ? 'block w-full' : 'aspect-square w-full min-w-0'} overflow-hidden rounded-md bg-zinc-100`} onClick={() => setPreviewImage(src)} onContextMenu={(event) => { event.preventDefault(); setImageMenu(index) }}><img src={src} alt={`概要图片 ${index + 1}`} className={imageUrls.length === 1 ? 'block h-auto max-h-[180px] w-full object-contain' : 'h-full w-full object-cover'} /></button><button type="button" aria-label={`打开概要第 ${index + 1} 张图片操作`} className="absolute right-1 top-1 flex h-4 w-6 items-center justify-center rounded-full bg-zinc-600/90 text-white opacity-0 group-hover/image:opacity-100" style={{ transform: 'scale(var(--mindmap-inverse-zoom, 1))', transformOrigin: 'top right' }} onClick={() => setImageMenu(imageMenu === index ? null : index)}><MoreHorizontal size={13} /></button>{imageMenu === index && <div className="absolute left-full top-0 z-[80] ml-2 w-24 rounded-lg border border-zinc-200 bg-white p-1 text-xs shadow-xl" style={{ transform: 'scale(var(--mindmap-inverse-zoom, 1))', transformOrigin: 'top left' }} onMouseLeave={() => setImageMenu(null)}><ImageMenuButton icon={<Copy size={14} />} label="复制" onClick={() => { void copyImage(src); setImageMenu(null) }} /><ImageMenuButton icon={<Scissors size={14} />} label="剪切" onClick={() => void copyImage(src).finally(() => updateFormat({ imageDataUrls: imageUrls.filter((_, itemIndex) => itemIndex !== index), imageDataUrl: undefined }))} /><ImageMenuButton icon={<Trash2 size={14} />} label="删除" danger onClick={() => updateFormat({ imageDataUrls: imageUrls.filter((_, itemIndex) => itemIndex !== index), imageDataUrl: undefined })} /></div>}</div>)}</div></div>}
    </div>
    {previewImage && createPortal(<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-8" onClick={() => setPreviewImage(null)}><img src={previewImage} alt="概要图片大图预览" className="max-h-full max-w-full object-contain" onClick={(event) => event.stopPropagation()} /></div>, document.body)}
  </div>
}

async function copyImage(dataUrl: string) {
  try {
    const blob = await (await fetch(dataUrl)).blob()
    if ('ClipboardItem' in window && navigator.clipboard?.write) await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
    else await navigator.clipboard?.writeText(dataUrl)
  } catch {
    await navigator.clipboard?.writeText(dataUrl)
  }
}

const EditableNodeTable: React.FC<{ table: string[][]; onChange: (table: string[][]) => void }> = ({ table, onChange }) => {
  const tableRef = React.useRef<HTMLDivElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const columns = Math.max(1, table[0]?.length ?? 1)
  const columnWidths = React.useMemo(() => Array.from({ length: columns }, (_, columnIndex) => {
    const longest = Math.max(0, ...table.map((row) => Array.from(row[columnIndex] ?? '').reduce((width, character) => width + (/[^\u0000-\u024f]/.test(character) ? 12 : 7), 0)))
    return Math.max(80, Math.min(192, longest + 24))
  }), [columns, table])
  const [activeCell, setActiveCell] = React.useState({ row: 0, column: 0 })
  const [openMenu, setOpenMenu] = React.useState<'row' | 'column' | null>(null)
  const [scrollLeft, setScrollLeft] = React.useState(0)
  React.useEffect(() => {
    if (!openMenu) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!tableRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer, true)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer, true)
  }, [openMenu])
  const updateCell = (rowIndex: number, columnIndex: number, value: string) => onChange(table.map((row, currentRow) => row.map((cell, currentColumn) => currentRow === rowIndex && currentColumn === columnIndex ? value : cell)))
  const insertColumn = (offset: 0 | 1) => {
    const at = activeCell.column + offset
    onChange(table.map((row) => [...row.slice(0, at), '', ...row.slice(at)]))
    setActiveCell((cell) => ({ ...cell, column: at }))
    setOpenMenu(null)
  }
  const deleteColumn = () => {
    if (columns <= 1) return
    onChange(table.map((row) => row.filter((_, index) => index !== activeCell.column)))
    setActiveCell((cell) => ({ ...cell, column: Math.max(0, Math.min(cell.column, columns - 2)) }))
    setOpenMenu(null)
  }
  const insertRow = (offset: 0 | 1) => {
    const at = activeCell.row + offset
    onChange([...table.slice(0, at), Array(columns).fill(''), ...table.slice(at)])
    setActiveCell((cell) => ({ ...cell, row: at }))
    setOpenMenu(null)
  }
  const deleteRow = () => {
    if (table.length <= 1) return
    onChange(table.filter((_, index) => index !== activeCell.row))
    setActiveCell((cell) => ({ ...cell, row: Math.max(0, Math.min(cell.row, table.length - 2)) }))
    setOpenMenu(null)
  }
  const activeColumnLeft = columnWidths.slice(0, activeCell.column).reduce((sum, width) => sum + width, 0) + columnWidths[activeCell.column] / 2 - scrollLeft
  const activeRowTop = 12 + activeCell.row * 28 + 14
  return <div ref={tableRef} className="group/table nodrag nopan relative mt-2 block w-max max-w-[630px] overflow-visible pb-1 pt-3" onClick={(event) => event.stopPropagation()}>
    <div ref={scrollRef} className="max-w-[630px] overflow-x-auto overflow-y-visible" onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}>
      <div className="grid rounded border border-zinc-300 bg-white text-[11px] font-normal text-zinc-700" style={{ gridTemplateColumns: columnWidths.map((width) => `${width}px`).join(' ') }}>
        {table.flatMap((row, rowIndex) => row.map((cell, columnIndex) => <div key={`${rowIndex}-${columnIndex}`} className="relative">
        <input aria-label={`表格第${rowIndex + 1}行第${columnIndex + 1}列`} value={cell} placeholder=" " className={`min-h-7 w-full border-b border-r border-zinc-200 bg-transparent px-2 py-1 outline-none focus:bg-indigo-50 ${activeCell.row === rowIndex && activeCell.column === columnIndex ? 'bg-indigo-50/50' : ''}`} onFocus={() => { setActiveCell({ row: rowIndex, column: columnIndex }); setOpenMenu(null) }} onClick={() => setActiveCell({ row: rowIndex, column: columnIndex })} onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)} />
        </div>))}
      </div>
    </div>
    <TableEllipsisButton ariaLabel="列操作" className="top-0" style={{ left: activeColumnLeft }} open={openMenu === 'column'} onClick={() => setOpenMenu(openMenu === 'column' ? null : 'column')}>
      <TableMenu side="right">
        <TableMenuButton label="在前面添加列" icon={<PanelLeftOpen size={15} />} onClick={() => insertColumn(0)} />
        <TableMenuButton label="在后面添加列" icon={<PanelRightOpen size={15} />} onClick={() => insertColumn(1)} />
        <div className="my-1 border-t border-zinc-100" />
        <TableMenuButton label="删除当前列" icon={<Trash2 size={15} />} danger disabled={columns <= 1} onClick={deleteColumn} />
      </TableMenu>
    </TableEllipsisButton>
    <TableEllipsisButton ariaLabel="行操作" className="-left-3" style={{ top: activeRowTop }} open={openMenu === 'row'} onClick={() => setOpenMenu(openMenu === 'row' ? null : 'row')}>
      <TableMenu side="left">
        <TableMenuButton label="在前面添加行" icon={<PanelTopOpen size={15} />} onClick={() => insertRow(0)} />
        <TableMenuButton label="在后面添加行" icon={<PanelBottomOpen size={15} />} onClick={() => insertRow(1)} />
        <div className="my-1 border-t border-zinc-100" />
        <TableMenuButton label="删除当前行" icon={<Trash2 size={15} />} danger disabled={table.length <= 1} onClick={deleteRow} />
      </TableMenu>
    </TableEllipsisButton>
  </div>
}

const TableEllipsisButton: React.FC<{ ariaLabel: string; className: string; style?: React.CSSProperties; open: boolean; onClick: () => void; children: React.ReactNode }> = ({ ariaLabel, className, style, open, onClick, children }) => <div className={`absolute z-[70] ${className}`} style={style}>
  <button type="button" aria-label={ariaLabel} className={`flex h-4 w-6 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-sm transition hover:bg-zinc-800 ${open ? 'bg-zinc-600/90 opacity-100' : 'bg-zinc-600/90 opacity-0 group-hover/table:opacity-100 group-focus-within/table:opacity-100'}`} style={{ transform: 'translateX(-50%) scale(var(--mindmap-inverse-zoom, 1))', transformOrigin: 'center' }} onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.stopPropagation(); onClick() }}><MoreHorizontal size={13} /></button>
  {open && children}
</div>

const TableMenu: React.FC<{ side?: 'left' | 'right'; children: React.ReactNode }> = ({ side, children }) => <div className={`absolute z-[80] ${side === 'left' ? 'right-full top-0 mr-1' : side === 'right' ? 'left-full top-1/2 ml-1' : 'left-1/2 top-full mt-1'}`}><div className="w-40 rounded-lg border border-zinc-200 bg-white p-1.5 text-xs text-zinc-700 shadow-xl" style={{ transform: `${side === 'right' ? 'translateY(-50%) ' : side ? '' : 'translateX(-50%) '}scale(var(--mindmap-inverse-zoom, 1))`, transformOrigin: side === 'left' ? 'top right' : side === 'right' ? 'center left' : 'top center' }}>{children}</div></div>

const TableMenuButton: React.FC<{ label: string; icon: React.ReactNode; danger?: boolean; disabled?: boolean; onClick: () => void }> = ({ label, icon, danger, disabled, onClick }) => <button type="button" aria-label={label} disabled={disabled} className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-35 ${danger ? 'text-rose-500 hover:bg-rose-50' : ''}`} onMouseDown={(event) => event.preventDefault()} onClick={(event) => { event.stopPropagation(); onClick() }}><span className="flex w-4 items-center justify-center">{icon}</span><span>{label}</span></button>

export const MindMapNode = React.memo(MindMapNodeComponent)
