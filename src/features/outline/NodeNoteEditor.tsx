import React from 'react'
import { FileText, X } from 'lucide-react'
import { useDocumentStore } from '../document/documentStore'

interface NodeNoteEditorProps {
  nodeId: string
  note?: string
}

export const NodeNoteEditor: React.FC<NodeNoteEditorProps> = ({ nodeId, note }) => {
  const updateNodeNote = useDocumentStore((s) => s.updateNodeNote)
  const [isOpen, setIsOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(note ?? '')

  React.useEffect(() => {
    if (!isOpen) {
      setDraft(note ?? '')
    }
  }, [isOpen, note])

  const commit = () => {
    updateNodeNote(nodeId, draft)
    setIsOpen(false)
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setIsOpen(true)
        }}
        className={`flex h-6 w-6 items-center justify-center rounded-md border transition focus:outline-none ${
          note
            ? 'border-[var(--color-primary)] bg-[var(--color-tint-lavender)] text-[var(--color-primary-deep)]'
            : 'border-transparent text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-[var(--color-surface)]'
        }`}
        title={note ? '编辑备注' : '添加备注'}
      >
        <FileText size={13} />
      </button>

      {isOpen && (
        <div
          className="ui-popover absolute right-0 top-7 z-50 w-72 p-3"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700">节点备注</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="ui-icon-button h-7 w-7"
              title="关闭"
            >
              <X size={13} />
            </button>
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                setDraft(note ?? '')
                setIsOpen(false)
              }
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault()
                commit()
              }
            }}
            className="w-full resize-none rounded-lg border border-[var(--color-hairline-strong)] bg-white p-3 text-sm text-[var(--color-charcoal)] outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            placeholder="记录补充说明"
            autoFocus
          />
        </div>
      )}
    </div>
  )
}
