import React from 'react'
import { OutlineNode } from '../../types/document'
import { useDocumentStore } from '../document/documentStore'
import { toast } from '../../components/common/Toast'
import { NodeNoteEditor } from './NodeNoteEditor'
import { NodeTagEditor } from './NodeTagEditor'
import { ButtonToggle, KnitGrip } from './components/OutlineNodeControls'
import { OutlineNodeTextContent } from './components/OutlineNodeTextContent'
import { SlashCommandMenu } from './components/SlashCommandMenu'
import { useNodeDragDrop } from './hooks/useNodeDragDrop'
import { useNodeKeyboardHandling } from './hooks/useNodeKeyboardHandling'
import { useSlashCommandMenu } from './hooks/useSlashCommandMenu'

interface OutlineNodeItemProps {
  node: OutlineNode
  depth: number
  path: number[]
  parentId: string | null
  isSelected: boolean
  isMultiSelected?: boolean
  isCollapsed: boolean
  onNavigate: (direction: 'up' | 'down') => void
  onNodeClick?: (event: React.MouseEvent, nodeId: string) => void
  onBatchMove?: (direction: 'up' | 'down') => boolean
  onBatchIndent?: () => boolean
  onBatchOutdent?: () => boolean
  onNodeContextMenu?: (event: React.MouseEvent, nodeId: string) => void
  themeText?: string
}

export const OutlineNodeItem: React.FC<OutlineNodeItemProps> = ({
  node,
  depth,
  path,
  parentId,
  isSelected,
  isMultiSelected = false,
  isCollapsed,
  onNavigate,
  onNodeClick,
  onBatchMove,
  onBatchIndent,
  onBatchOutdent,
  onNodeContextMenu,
  themeText,
}) => {
  const selectNode = useDocumentStore((s) => s.selectNode)
  const updateNodeText = useDocumentStore((s) => s.updateNodeText)
  const toggleCollapse = useDocumentStore((s) => s.toggleCollapse)
  const indentNode = useDocumentStore((s) => s.indentNode)
  const outdentNode = useDocumentStore((s) => s.outdentNode)
  const moveNode = useDocumentStore((s) => s.moveNode)
  const moveNodeToSibling = useDocumentStore((s) => s.moveNodeToSibling)
  const insertNode = useDocumentStore((s) => s.insertNode)
  const deleteNode = useDocumentStore((s) => s.deleteNode)
  const beginTextEditSession = useDocumentStore((s) => s.beginTextEditSession)
  const commitTextEditSession = useDocumentStore((s) => s.commitTextEditSession)
  const isFocusedNode = useDocumentStore((s) => s.focusedNodeId === node.id)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isComposing, setIsComposing] = React.useState(false)
  const slashMenu = useSlashCommandMenu()
  const {
    activeCommand,
    activeIndex,
    close: closeSlashMenu,
    commands: slashCommands,
    isOpen: showSlashMenu,
    moveNext: moveSlashMenuNext,
    movePrevious: moveSlashMenuPrevious,
    open: openSlashMenu,
  } = slashMenu
  const hasChildren = node.children && node.children.length > 0

  // Focus caret restoration
  React.useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus()
      const val = inputRef.current.value
      inputRef.current.setSelectionRange(val.length, val.length)
    } else {
      closeSlashMenu()
    }
  }, [closeSlashMenu, isSelected])

  React.useEffect(() => {
    if (!isFocusedNode) return
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [isFocusedNode])

  const executeSlashCommand = React.useCallback((key: string) => {
    // 1. Remove the '/' from text if present
    if (inputRef.current) {
      const val = inputRef.current.value
      if (val.endsWith('/')) {
        updateNodeText(node.id, val.substring(0, val.length - 1))
      }
    }

    // 2. Run action
    switch (key) {
      case 'indent':
        indentNode(node.id)
        break
      case 'outdent':
        outdentNode(node.id)
        break
      case 'delete':
        deleteNode(node.id)
        toast.info('已删除大纲节点')
        break
    }

    closeSlashMenu()
  }, [closeSlashMenu, deleteNode, indentNode, node.id, outdentNode, updateNodeText])

  const handleKeyDown = useNodeKeyboardHandling({
    nodeId: node.id,
    hasChildren,
    isCollapsed,
    isComposing,
    isSlashMenuOpen: showSlashMenu,
    activeSlashCommand: activeCommand,
    onSlashMenuNext: moveSlashMenuNext,
    onSlashMenuPrevious: moveSlashMenuPrevious,
    onSlashMenuClose: closeSlashMenu,
    onSlashCommand: executeSlashCommand,
    onSelectNone: () => selectNode(null),
    onUpdateText: updateNodeText,
    onInsertNode: insertNode,
    onDeleteNode: deleteNode,
    onIndentNode: indentNode,
    onOutdentNode: outdentNode,
    onMoveNode: moveNode,
    onToggleCollapse: toggleCollapse,
    onNavigate,
    onBatchMove,
    onBatchIndent,
    onBatchOutdent,
  })

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    updateNodeText(node.id, text)
    
    // Check if ends with '/' to open command menu
    if (text.endsWith('/')) {
      openSlashMenu()
    } else if (showSlashMenu && !text.includes('/')) {
      closeSlashMenu()
    }
  }

  const siblingIndex = path[path.length - 1] ?? 0
  const { handlePointerDown, isDragging, isDropTarget, dragOffset, previewShiftY } = useNodeDragDrop({
    nodeId: node.id,
    parentId,
    siblingIndex,
    onMoveToSibling: moveNodeToSibling,
  })

  return (
    <>
    <div
      ref={containerRef}
      data-node-id={node.id}
      data-node-parent-id={parentId ?? ''}
      data-node-sibling-index={siblingIndex}
      data-drag-state={isDragging ? 'source' : undefined}
      data-drop-target={isDropTarget ? 'true' : undefined}
      style={
        isDragging
          ? { transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(1.015)` }
          : previewShiftY !== 0
            ? { transform: `translate3d(0, ${previewShiftY}px, 0)` }
            : { backgroundColor: node.format?.backgroundColor }
      }
      className={`group relative flex min-h-9 items-center rounded-lg border px-2 py-1 transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 ${
        isSelected || isMultiSelected
          ? 'bg-[var(--color-tint-lavender)] border-solid border-[var(--color-primary)]/60 text-zinc-900 shadow-sm'
          : isFocusedNode
            ? 'bg-[var(--color-tint-yellow)] border-[#e6cf72] text-zinc-900 shadow-sm'
          : 'text-zinc-700 border-transparent hover:bg-[var(--color-surface)] hover:text-zinc-900'
      } ${
        isDragging
          ? 'pointer-events-none z-10 transform-gpu will-change-transform opacity-75 shadow-lg ring-1 ring-amber-900/20 duration-75 ease-out'
          : ''
      } ${
        isDropTarget
          ? 'border-[var(--color-primary)] bg-[var(--color-tint-lavender)] shadow-sm ring-1 ring-[var(--color-primary)]/30'
          : ''
      } ${
        previewShiftY !== 0 ? 'transform-gpu will-change-transform duration-200 ease-out' : ''
      }`}
      onClick={(e) => {
        e.stopPropagation()
        if (onNodeClick) {
          onNodeClick(e, node.id)
        } else {
          selectNode(node.id)
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onNodeContextMenu?.(event, node.id)
      }}
    >
      {/* Stitch Indent Guide Lines */}
      {Array.from({ length: depth }).map((_, i) => (
        <div
          key={i}
          className="flex h-full w-6 shrink-0 justify-center border-r border-solid border-zinc-200"
        />
      ))}

      {/* Knit Grip Handle */}
      <div
        onPointerDown={handlePointerDown}
        className={`flex h-full w-5 shrink-0 items-center justify-center transition-transform cursor-grab active:cursor-grabbing ${
          isDragging ? 'scale-110 cursor-grabbing' : ''
        }`}
        title="拖动排序"
      >
        <KnitGrip />
      </div>

      {/* Button Fold Toggle */}
      <div className="flex w-6 shrink-0 items-center justify-center">
        {hasChildren ? (
          <ButtonToggle
            isCollapsed={!!isCollapsed}
            onClick={() => toggleCollapse(node.id)}
          />
        ) : (
          <div className="h-1 w-1 rounded-full bg-amber-900/25" />
        )}
      </div>

      {/* Text Node */}
      <div className="flex-1 min-w-0 pl-1.5">
        {isSelected ? (
          <input
            ref={inputRef}
            type="text"
            value={node.text}
            onFocus={() => beginTextEditSession(node.id)}
            onBlur={() => commitTextEditSession(node.id)}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            className="outline-inline-editor w-full border-0 bg-transparent p-0 text-sm font-medium text-zinc-900 shadow-none outline-none placeholder-zinc-400 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none"
            style={{
              color: node.format?.color ?? themeText,
              fontSize: node.format?.fontSize,
              fontWeight: node.format?.bold ? 700 : undefined,
              fontStyle: node.format?.italic ? 'italic' : undefined,
              textDecoration: [node.format?.underline && 'underline', node.format?.strike && 'line-through'].filter(Boolean).join(' ') || undefined,
            }}
            placeholder="输入编织内容..."
          />
        ) : (
          <div className={`${node.format?.code ? 'rounded bg-zinc-100 px-1.5 py-1 font-mono' : ''} ${node.format?.quote ? 'border-l-2 border-indigo-400 pl-2' : ''}`} style={{ color: node.format?.color ?? themeText, fontSize: node.format?.fontSize, fontWeight: node.format?.bold ? 700 : undefined, fontStyle: node.format?.italic ? 'italic' : undefined, textDecoration: [node.format?.underline && 'underline', node.format?.strike && 'line-through'].filter(Boolean).join(' ') || undefined }}>
            {node.format?.link ? <a href={node.format.link} target="_blank" rel="noreferrer" className="underline decoration-zinc-400 underline-offset-2" onClick={(event) => event.stopPropagation()}><OutlineNodeTextContent text={node.text} /></a> :
            <OutlineNodeTextContent text={node.text} />
            }
          </div>
        )}
      </div>

      <div
        data-node-actions
        className="ml-2 flex max-w-[40%] shrink-0 items-center gap-1 overflow-visible"
      >
        {node.format?.imageDataUrl && <img src={node.format.imageDataUrl} alt="节点图片" className="mr-1 h-7 w-10 rounded object-cover" />}
        <div className="min-w-0 overflow-hidden">
          <NodeTagEditor nodeId={node.id} tags={node.tags} />
        </div>
        <NodeNoteEditor nodeId={node.id} note={node.note} />
      </div>

      {/* Slash Commands Dropdown washed-paper Menu */}
      {showSlashMenu && isSelected && (
        <SlashCommandMenu
          commands={slashCommands}
          activeIndex={activeIndex}
          onCommand={executeSlashCommand}
        />
      )}
    </div>
    </>
  )
}
