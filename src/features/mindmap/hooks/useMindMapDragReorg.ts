import React from 'react'
import type { Node } from 'reactflow'
import type { MindMapLayoutStrategy, MindMapLayoutState, OutlineNode } from '../../../types/document'
import { findNodeById } from '../mindMapActions'
import {
  MindMapDropZone,
  resolveMindMapDragTarget,
  resolveMindMapDropMove,
  resolveMindMapDropMoveResult,
} from '../mindMapReorder'
import { createMindMapLayoutState } from '../mindMapLayoutState'
import type { MindMapMode } from '../MindMapToolbar'
import type { MindMapNodeData } from '../MindMapNode'

type MindMapDropPreview = { nodeId: string; zone: MindMapDropZone; invalid?: boolean } | null

interface UseMindMapDragReorgParams {
  nodes: Node<MindMapNodeData>[]
  setNodes: React.Dispatch<React.SetStateAction<Node<MindMapNodeData>[]>>
  mode: MindMapMode
  currentDoc: { root: OutlineNode; mindMapLayout?: MindMapLayoutState } | null
  forcePreviewActive: boolean
  parentByNodeId: Map<string, string | null>
  childIndexByNodeId: Map<string, number>
  getNodeDescendantIds: (nodeId: string) => Set<string>
  moveNodeToParent: (sourceNodeId: string, targetParentNodeId: string, targetIndex: number) => void
  commitMindMapLayout: (layout: MindMapLayoutState) => void
  layoutStrategy: MindMapLayoutStrategy
  setFeedback: (message: string) => void
}

export function useMindMapDragReorg({
  nodes,
  setNodes,
  mode,
  currentDoc,
  forcePreviewActive,
  parentByNodeId,
  childIndexByNodeId,
  getNodeDescendantIds,
  moveNodeToParent,
  commitMindMapLayout,
  layoutStrategy,
  setFeedback,
}: UseMindMapDragReorgParams) {
  const dragStartPositionsRef = React.useRef<Map<string, { x: number; y: number }> | null>(null)
  const draggedSubtreeIdsRef = React.useRef<Set<string>>(new Set())

  const clearDropState = React.useCallback((restorePositions: boolean) => {
    setNodes((currentNodes) => currentNodes.map((node) => ({
      ...node,
      position: restorePositions
        ? dragStartPositionsRef.current?.get(node.id) ?? node.position
        : node.position,
      data: { ...node.data, dropState: null, invalidDrop: false },
    })))
  }, [setNodes])

  React.useEffect(() => {
    if (mode !== 'layout') return
    clearDropState(true)
    dragStartPositionsRef.current = null
    draggedSubtreeIdsRef.current = new Set()
  }, [clearDropState, mode])

  const handleNodeDragStart = React.useCallback((_event: React.MouseEvent, draggedNode: Node) => {
    const freeCanvasDrag = layoutStrategy === 'free-canvas' && mode === 'layout'
    if (!freeCanvasDrag && (mode !== 'reorganize' || draggedNode.id === currentDoc?.root.id)) return
    dragStartPositionsRef.current = new Map(nodes.map((node) => [node.id, node.position]))
    draggedSubtreeIdsRef.current = freeCanvasDrag
      ? new Set([draggedNode.id])
      : new Set([draggedNode.id, ...getNodeDescendantIds(draggedNode.id)])
  }, [currentDoc?.root.id, getNodeDescendantIds, layoutStrategy, mode, nodes])

  const resolveDraggedNodeTarget = React.useCallback((draggedNode: Node) => {
    const excludedIds = new Set([draggedNode.id, ...getNodeDescendantIds(draggedNode.id)])
    return resolveMindMapDragTarget(draggedNode, nodes.filter((node) => !excludedIds.has(node.id)))
  }, [getNodeDescendantIds, nodes])

  const updateDropPreview = React.useCallback((preview: MindMapDropPreview, draggedNode: Node) => {
    const startPositions = dragStartPositionsRef.current
    const draggedStart = startPositions?.get(draggedNode.id)
    const delta = draggedStart
      ? { x: draggedNode.position.x - draggedStart.x, y: draggedNode.position.y - draggedStart.y }
      : { x: 0, y: 0 }

    setNodes((currentNodes) => currentNodes.map((node) => {
      const start = startPositions?.get(node.id) ?? node.position
      const followsDraggedSubtree = draggedSubtreeIdsRef.current.has(node.id)
      return {
        ...node,
        position: followsDraggedSubtree
          ? { x: start.x + delta.x, y: start.y + delta.y }
          : start,
        data: {
          ...node.data,
          dropState: preview?.nodeId === node.id && !preview.invalid ? preview.zone : null,
          invalidDrop: preview?.nodeId === node.id && Boolean(preview.invalid),
        },
      }
    }))
  }, [setNodes])

  const resolveMove = React.useCallback((draggedNode: Node, target: ReturnType<typeof resolveMindMapDragTarget>) => {
    if (!target || !currentDoc) return null
    const targetNode = findNodeById(currentDoc.root, target.targetNodeId)
    return resolveMindMapDropMove({
      sourceNodeId: draggedNode.id,
      targetNodeId: target.targetNodeId,
      zone: target.zone,
      targetParentId: parentByNodeId.get(target.targetNodeId),
      targetIndex: childIndexByNodeId.get(target.targetNodeId),
      targetChildCount: targetNode?.children.length ?? 0,
      rootNodeId: currentDoc.root.id,
      descendantNodeIds: getNodeDescendantIds(draggedNode.id),
    })
  }, [childIndexByNodeId, currentDoc, getNodeDescendantIds, parentByNodeId])

  const commitBalancedSidePreference = React.useCallback((draggedNode: Node) => {
    if (!currentDoc || layoutStrategy !== 'balanced-mindmap') return
    const rootFlowNode = nodes.find((node) => node.id === currentDoc.root.id)
    if (!rootFlowNode) return
    const rootWidth = rootFlowNode.width ?? 120
    const draggedWidth = draggedNode.width ?? 120
    const rootCenterX = rootFlowNode.position.x + rootWidth / 2
    const draggedCenterX = draggedNode.position.x + draggedWidth / 2
    const prefersLeft = draggedCenterX < rootCenterX
    const startPositions = dragStartPositionsRef.current
    const positions = nodes.reduce<Record<string, { x: number; y: number }>>((result, node) => {
      result[node.id] = startPositions?.get(node.id) ?? node.position
      return result
    }, {})
    positions[draggedNode.id] = {
      ...positions[draggedNode.id],
      x: prefersLeft ? rootFlowNode.position.x - draggedWidth - 1 : rootFlowNode.position.x + rootWidth + 1,
    }
    const nextLayout = createMindMapLayoutState(positions, {
      strategy: 'balanced-mindmap',
      source: 'auto',
      previous: currentDoc.mindMapLayout,
    })
    nextLayout.nodes[draggedNode.id] = {
      ...nextLayout.nodes[draggedNode.id],
      locked: false,
      source: 'auto',
    }
    commitMindMapLayout(nextLayout)
  }, [commitMindMapLayout, currentDoc, layoutStrategy, nodes])

  const handleNodeDrag = React.useCallback((_event: React.MouseEvent, draggedNode: Node) => {
    if (layoutStrategy === 'free-canvas' && mode === 'layout') return
    if (mode !== 'reorganize' || draggedNode.id === currentDoc?.root.id) return
    if (!dragStartPositionsRef.current) handleNodeDragStart(_event, draggedNode)
    const target = resolveDraggedNodeTarget(draggedNode)
    const move = resolveMove(draggedNode, target)
    updateDropPreview(target ? { nodeId: target.targetNodeId, zone: target.zone, invalid: !move } : null, draggedNode)

    if (target && !move && currentDoc) {
      const targetNode = findNodeById(currentDoc.root, target.targetNodeId)
      const result = resolveMindMapDropMoveResult({
        sourceNodeId: draggedNode.id,
        targetNodeId: target.targetNodeId,
        zone: target.zone,
        targetParentId: parentByNodeId.get(target.targetNodeId),
        targetIndex: childIndexByNodeId.get(target.targetNodeId),
        targetChildCount: targetNode?.children.length ?? 0,
        rootNodeId: currentDoc.root.id,
        descendantNodeIds: getNodeDescendantIds(draggedNode.id),
      })
      if ('reason' in result) setFeedback(result.reason)
    }
  }, [
    childIndexByNodeId,
    currentDoc,
    getNodeDescendantIds,
    handleNodeDragStart,
    layoutStrategy,
    mode,
    parentByNodeId,
    resolveDraggedNodeTarget,
    resolveMove,
    setFeedback,
    updateDropPreview,
  ])

  const handleNodeDragStop = React.useCallback((_event: React.MouseEvent, draggedNode: Node) => {
    if (currentDoc && layoutStrategy === 'free-canvas' && mode === 'layout' && !forcePreviewActive) {
      const startPositions = dragStartPositionsRef.current
      const positions = nodes.reduce<Record<string, { x: number; y: number }>>((result, node) => {
        result[node.id] = startPositions?.get(node.id) ?? node.position
        return result
      }, {})
      positions[draggedNode.id] = draggedNode.position
      commitMindMapLayout(createMindMapLayoutState(positions, {
        strategy: 'free-canvas',
        source: 'manual',
        lockedNodeIds: new Set([draggedNode.id]),
        previous: currentDoc.mindMapLayout,
      }))
      setFeedback('已保存自由布局位置')
      dragStartPositionsRef.current = null
      draggedSubtreeIdsRef.current = new Set()
      return
    }
    if (!currentDoc || mode !== 'reorganize' || draggedNode.id === currentDoc.root.id) return
    if (forcePreviewActive) return

    const target = resolveDraggedNodeTarget(draggedNode)
    const move = resolveMove(draggedNode, target)
    const originalParentId = parentByNodeId.get(draggedNode.id)
    clearDropState(true)

    if (move) {
      moveNodeToParent(draggedNode.id, move.parentNodeId, move.targetIndex)
      if (move.parentNodeId === currentDoc.root.id) commitBalancedSidePreference(draggedNode)
      const parentTitle = findNodeById(currentDoc.root, move.parentNodeId)?.text ?? '目标节点'
      setFeedback(`已吸附到「${parentTitle}」并重新排版`)
    } else if (!target && originalParentId === currentDoc.root.id && layoutStrategy === 'balanced-mindmap') {
      commitBalancedSidePreference(draggedNode)
      setFeedback('已切换分支方向并重新排版')
    }

    dragStartPositionsRef.current = null
    draggedSubtreeIdsRef.current = new Set()
  }, [
    clearDropState,
    commitBalancedSidePreference,
    currentDoc,
    forcePreviewActive,
    layoutStrategy,
    mode,
    moveNodeToParent,
    nodes,
    parentByNodeId,
    resolveDraggedNodeTarget,
    resolveMove,
    setFeedback,
  ])

  return { handleNodeDragStart, handleNodeDrag, handleNodeDragStop }
}
