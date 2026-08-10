import React from 'react'
import type { Node, ReactFlowInstance } from 'reactflow'

interface MindMapCanvasHandlerOptions {
  flowInstanceRef: React.MutableRefObject<ReactFlowInstance | null>
  selectNode: (nodeId: string | null) => void
  selectedNodeIds: string[]
  setSelectedNodeIds: (nodeIds: string[]) => void
  startEditing: (nodeId: string) => void
  openContextMenu: (nodeId: string, x: number, y: number) => void
  closeContextMenu: () => void
}

export function useMindMapCanvasHandlers({
  flowInstanceRef,
  selectNode,
  selectedNodeIds,
  setSelectedNodeIds,
  startEditing,
  openContextMenu,
  closeContextMenu,
}: MindMapCanvasHandlerOptions) {
  const handleNodeClick = React.useCallback((event: React.MouseEvent, node: Node) => {
    if (event.ctrlKey || event.metaKey) {
      const next = selectedNodeIds.includes(node.id)
        ? selectedNodeIds.filter((id) => id !== node.id)
        : [...selectedNodeIds, node.id]
      setSelectedNodeIds(next)
      return
    }
    if (selectedNodeIds.length === 1 && selectedNodeIds[0] === node.id) {
      startEditing(node.id)
      return
    }
    selectNode(node.id)
  }, [selectNode, selectedNodeIds, setSelectedNodeIds, startEditing])

  const handleNodeDoubleClick = React.useCallback((_event: React.MouseEvent, node: Node) => {
    startEditing(node.id)
  }, [startEditing])

  const handleNodeContextMenu = React.useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    openContextMenu(node.id, event.clientX, event.clientY)
  }, [openContextMenu])

  const handlePaneClick = React.useCallback(() => {
    closeContextMenu()
    selectNode(null)
  }, [closeContextMenu, selectNode])

  const handleInit = React.useCallback((instance: ReactFlowInstance) => {
    flowInstanceRef.current = instance
  }, [flowInstanceRef])

  return {
    handleNodeClick,
    handleNodeDoubleClick,
    handleNodeContextMenu,
    handlePaneClick,
    handleInit,
  }
}
