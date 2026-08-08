import React from 'react'
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react'

export const ButtonToggle: React.FC<{ isCollapsed: boolean; onClick: () => void }> = ({
  isCollapsed,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      aria-label={isCollapsed ? '展开节点' : '折叠节点'}
      className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none"
      title={isCollapsed ? '展开' : '折叠'}
    >
      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
    </button>
  )
}

export const KnitGrip: React.FC = () => {
  return <GripVertical size={13} className="opacity-30 transition-opacity group-hover:opacity-70" />
}
