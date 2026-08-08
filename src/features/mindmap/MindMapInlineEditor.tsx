import React from 'react'
import type { NodeTextFormat } from '../../types/document'

interface MindMapInlineEditorProps {
  nodeId?: string
  value: string
  format?: NodeTextFormat
  onChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
  onDeleteEmpty: () => void
  onIndent: () => void
  onOutdent: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export const MindMapInlineEditor: React.FC<MindMapInlineEditorProps> = ({
  nodeId = '',
  value,
  format,
  onChange,
  onCommit,
  onCancel,
  onDeleteEmpty,
  onIndent,
  onOutdent,
  onMoveUp,
  onMoveDown,
}) => {
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const isComposingRef = React.useRef(false)
  const [isComposing, setIsComposing] = React.useState(false)
  const [draftValue, setDraftValue] = React.useState(value)
  const [lastCommittedValue, setLastCommittedValue] = React.useState(value)

  React.useEffect(() => {
    if (!isComposing && value !== lastCommittedValue) {
      setDraftValue(value)
      setLastCommittedValue(value)
    }
  }, [isComposing, lastCommittedValue, value])

  React.useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.focus({ preventScroll: true })
    input.setSelectionRange(input.value.length, input.value.length)
  }, [])

  React.useLayoutEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [draftValue])

  const commitDraft = React.useCallback((nextValue = draftValue) => {
    onChange(nextValue)
    setLastCommittedValue(nextValue)
    onCommit()
  }, [draftValue, onChange, onCommit])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
    if (isComposingRef.current) return

    if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowUp') {
      event.preventDefault()
      onMoveUp()
      return
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowDown') {
      event.preventDefault()
      onMoveDown()
      return
    }

    switch (event.key) {
      case 'Enter':
        if (event.shiftKey) {
          return
        }
        event.preventDefault()
        commitDraft()
        break
      case 'Tab':
        event.preventDefault()
        if (event.shiftKey) {
          onOutdent()
        } else {
          onIndent()
        }
        break
      case 'Backspace':
        if (draftValue.length === 0) {
          event.preventDefault()
          onDeleteEmpty()
        }
        break
      case 'Escape':
        event.preventDefault()
        onCancel()
        break
    }
  }

  const keepMouseEventInsideEditor = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
  }

  return (
    <textarea
      ref={inputRef}
      data-mindmap-editor-node-id={nodeId}
      rows={1}
      aria-label="编辑节点文本"
      className="nodrag nopan block w-auto min-w-[36px] max-w-[626px] touch-manipulation resize-none overflow-hidden whitespace-pre-wrap border-0 bg-transparent p-0 text-left text-sm font-medium leading-[1.45] text-zinc-800 shadow-none outline-none [field-sizing:content] focus:border-0 focus:ring-0"
      style={{ color: format?.color, fontSize: format?.fontSize, fontWeight: format?.bold ? 700 : undefined, fontStyle: format?.italic ? 'italic' : undefined, textDecoration: [format?.underline && 'underline', format?.strike && 'line-through'].filter(Boolean).join(' ') || undefined }}
      value={draftValue}
      placeholder="空白节点"
      onChange={(event) => {
        setDraftValue(event.target.value)
        if (!isComposingRef.current) {
          onChange(event.target.value)
          setLastCommittedValue(event.target.value)
        }
      }}
      onBlur={() => commitDraft()}
      onCompositionStart={() => {
        isComposingRef.current = true
        setIsComposing(true)
      }}
      onCompositionEnd={(event) => {
        const committedValue = event.currentTarget.value
        isComposingRef.current = false
        setIsComposing(false)
        setDraftValue(committedValue)
        onChange(committedValue)
        setLastCommittedValue(committedValue)
      }}
      onPointerDown={keepMouseEventInsideEditor}
      onMouseDown={keepMouseEventInsideEditor}
      onClick={keepMouseEventInsideEditor}
      onKeyDown={handleKeyDown}
    />
  )
}
