import React from 'react'
import type { NodeMenuAction } from '../../document/NodeContextMenu'

interface UseMindMapKeyboardShortcutsParams {
  selectedNodeId: string | null
  selectedNodeIds: string[]
  deleteSelectedNodes: () => void
  runAction: (nodeId: string, action: NodeMenuAction) => void
  closeContextMenu: () => void
  clearEditing: () => void
  selectNode: (nodeId: string | null) => void
}

const isTextInputTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="menu"], [role="dialog"]'))
}

export function useMindMapKeyboardShortcuts({
  selectedNodeId,
  selectedNodeIds,
  deleteSelectedNodes,
  runAction,
  closeContextMenu,
  clearEditing,
  selectNode,
}: UseMindMapKeyboardShortcutsParams) {
  const handleShortcut = React.useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') closeContextMenu()
    if (isTextInputTarget(event.target) || !selectedNodeId) return

    if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowUp') {
      event.preventDefault()
      runAction(selectedNodeId, 'moveUp')
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'ArrowDown') {
      event.preventDefault()
      runAction(selectedNodeId, 'moveDown')
      return
    }

    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        event.preventDefault()
        if (selectedNodeIds.length > 1) deleteSelectedNodes()
        else runAction(selectedNodeId, 'delete')
        break
      case 'Enter':
        event.preventDefault()
        runAction(selectedNodeId, event.shiftKey ? 'insertChild' : 'insertSibling')
        break
      case 'Tab':
        event.preventDefault()
        runAction(selectedNodeId, event.shiftKey ? 'outdent' : 'insertChild')
        break
      case 'Escape':
        event.preventDefault()
        clearEditing()
        selectNode(null)
        break
    }
  }, [clearEditing, closeContextMenu, deleteSelectedNodes, runAction, selectNode, selectedNodeId, selectedNodeIds.length])

  React.useEffect(() => {
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [handleShortcut])

  // ReactFlow still expects a handler prop, but the window listener is the single
  // source of truth so bubbling events cannot execute structural actions twice.
  return React.useCallback<React.KeyboardEventHandler>(() => undefined, [])
}
