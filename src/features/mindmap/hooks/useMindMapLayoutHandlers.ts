import React from 'react'
import type { MindMapLayoutHandlers } from './useMindMapLayoutComputation'

export function useMindMapLayoutHandlers(handlers: MindMapLayoutHandlers): MindMapLayoutHandlers {
  return React.useMemo(() => handlers, [
    handlers.startEditing,
    handlers.selectNode,
    handlers.cancelEditing,
    handlers.finishEditing,
    handlers.handleDelete,
    handlers.indentNode,
    handlers.insertChildAndEdit,
    handlers.insertSiblingAndEdit,
    handlers.moveNode,
    handlers.outdentNode,
    handlers.toggleBranchSide,
    handlers.toggleCollapse,
    handlers.updateNodeText,
  ])
}
