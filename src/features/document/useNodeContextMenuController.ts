import React from 'react'
import type { OutlineDocument } from '../../types/document'
import { NodeMenuAction } from './NodeContextMenu'
import { useDocumentStore } from './documentStore'
import { findNodeById } from './nodeActions'

interface NodeContextMenuState {
  nodeId: string
  x: number
  y: number
}

interface UseNodeContextMenuControllerOptions {
  currentDoc: OutlineDocument | null
  onStartEditing: (nodeId: string) => void
  onAfterDelete?: (deletedNodeId: string) => void
}

export function useNodeContextMenuController({
  currentDoc,
  onStartEditing,
  onAfterDelete,
}: UseNodeContextMenuControllerOptions) {
  const selectNode = useDocumentStore((s) => s.selectNode)
  const toggleCollapse = useDocumentStore((s) => s.toggleCollapse)
  const indentNode = useDocumentStore((s) => s.indentNode)
  const outdentNode = useDocumentStore((s) => s.outdentNode)
  const moveNode = useDocumentStore((s) => s.moveNode)
  const insertSiblingNode = useDocumentStore((s) => s.insertSiblingNode)
  const insertChildNode = useDocumentStore((s) => s.insertChildNode)
  const deleteNode = useDocumentStore((s) => s.deleteNode)
  const getNodeOperationState = useDocumentStore((s) => s.getNodeOperationState)

  const [contextMenu, setContextMenu] = React.useState<NodeContextMenuState | null>(null)
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null)

  const closeContextMenu = React.useCallback(() => {
    setContextMenu(null)
  }, [])

  const openContextMenu = React.useCallback((nodeId: string, x: number, y: number) => {
    selectNode(nodeId)
    setContextMenu({ nodeId, x, y })
  }, [selectNode])

  const insertSiblingAndEdit = React.useCallback((nodeId: string) => {
    const insertedId = insertSiblingNode(nodeId, '')
    if (!insertedId) return
    onStartEditing(insertedId)
  }, [insertSiblingNode, onStartEditing])

  const insertChildAndEdit = React.useCallback((nodeId: string) => {
    const insertedId = insertChildNode(nodeId, '')
    if (!insertedId) return

    onStartEditing(insertedId)
  }, [insertChildNode, onStartEditing])

  const handleDelete = React.useCallback((nodeId: string) => {
    if (!currentDoc) return
    const node = findNodeById(currentDoc.root, nodeId)
    if (!node) return

    if (node.children.length > 0) {
      setDeleteTargetId(nodeId)
      return
    }

    deleteNode(nodeId)
    onAfterDelete?.(nodeId)
  }, [currentDoc, deleteNode, onAfterDelete])

  const confirmDelete = React.useCallback(() => {
    if (!deleteTargetId) return

    deleteNode(deleteTargetId)
    setDeleteTargetId(null)
    onAfterDelete?.(deleteTargetId)
  }, [deleteNode, deleteTargetId, onAfterDelete])

  const cancelDelete = React.useCallback(() => {
    setDeleteTargetId(null)
  }, [])

  const runAction = React.useCallback((nodeId: string, action: NodeMenuAction) => {
    const operationState = getNodeOperationState(nodeId)

    switch (action) {
      case 'insertSibling':
        if (!operationState.canInsertSibling) return
        insertSiblingAndEdit(nodeId)
        break
      case 'insertChild':
        if (!operationState.canInsertChild) return
        insertChildAndEdit(nodeId)
        break
      case 'rename':
        onStartEditing(nodeId)
        break
      case 'delete':
        if (!operationState.canDelete) return
        handleDelete(nodeId)
        break
      case 'toggleCollapse':
        if (!operationState.canToggleCollapse) return
        toggleCollapse(nodeId)
        break
      case 'moveUp':
        if (!operationState.canMoveUp) return
        moveNode(nodeId, 'up')
        break
      case 'moveDown':
        if (!operationState.canMoveDown) return
        moveNode(nodeId, 'down')
        break
      case 'indent':
        if (!operationState.canIndent) return
        indentNode(nodeId)
        break
      case 'outdent':
        if (!operationState.canOutdent) return
        outdentNode(nodeId)
        break
    }

    setContextMenu(null)
  }, [
    getNodeOperationState,
    handleDelete,
    indentNode,
    insertChildAndEdit,
    insertSiblingAndEdit,
    moveNode,
    onStartEditing,
    outdentNode,
    toggleCollapse,
  ])

  const contextNode = contextMenu && currentDoc ? findNodeById(currentDoc.root, contextMenu.nodeId) : null
  const deleteTarget = deleteTargetId && currentDoc ? findNodeById(currentDoc.root, deleteTargetId) : null

  return {
    contextMenu,
    contextNode,
    deleteTarget,
    closeContextMenu,
    openContextMenu,
    runAction,
    confirmDelete,
    cancelDelete,
    insertSiblingAndEdit,
    insertChildAndEdit,
    handleDelete,
  }
}
