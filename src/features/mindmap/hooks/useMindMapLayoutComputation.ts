import React from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Edge, Node } from 'reactflow'
import type { MindMapAppearance, MindMapLayoutStrategy, MindMapLayoutState, OutlineNode } from '../../../types/document'
import { outlineToGraph } from '../outlineToGraph'
import { createBranchSideKey, filterCollapsedBranchSides } from '../branchSideCollapse'
import { attachLayoutNodeSizes, buildMindMapNodeSizes } from '../nodeDataAssembler'
import {
  layoutMindMap,
  type MindMapLayoutDiagnostics,
  type MindMapLayoutInput,
  type MindMapLayoutResult,
  type MindMapNodeSize,
} from '../layoutEngine'
import type { MindMapNodeData } from '../MindMapNode'
import { DEFAULT_MIND_MAP_LAYOUT_STRATEGY } from '../mindMapLayoutState'
import { getMindMapLayoutForStrategy } from '../mindMapLayoutState'
import { resolveMindMapTheme } from '../mindMapThemes'

export interface MindMapLayoutHandlers {
  startEditing: MindMapNodeData['onStartEditing']
  selectNode: MindMapNodeData['onSelectNode']
  toggleBranchSide: MindMapNodeData['onToggleBranchSide']
  toggleCollapse: MindMapNodeData['onToggleCollapse']
  updateNodeText: MindMapNodeData['onTextChange']
  finishEditing: MindMapNodeData['onCommitEdit']
  cancelEditing: MindMapNodeData['onCancelEdit']
  handleDelete: MindMapNodeData['onDeleteEmpty']
  insertSiblingAndEdit: MindMapNodeData['onInsertSibling']
  insertChildAndEdit: MindMapNodeData['onInsertChild']
  indentNode: MindMapNodeData['onIndent']
  outdentNode: MindMapNodeData['onOutdent']
  moveNode: (nodeId: string, direction: 'up' | 'down') => void
}

interface UseMindMapLayoutComputationParams {
  currentDoc: { root: OutlineNode; mindMapLayout?: MindMapLayoutState; mindMapLayouts?: Record<string, MindMapLayoutState>; mindMapAppearance?: MindMapAppearance } | null
  collapsedNodeIds: Set<string>
  validFocusRootNodeId: string | null
  exportClean: boolean
  graphRootNode: OutlineNode | null
  measuredNodeSizes: Record<string, MindMapNodeSize>
  measuredNodeSizeSignature: string
  experimentalLayoutEnabled: boolean
  layoutStrategy: MindMapLayoutStrategy
  depthByNodeId: Map<string, number>
  visibleNodeIds: Set<string>
  collapsedBranchSides: Set<string>
  activeMatchNodeId: string | null
  matchedNodeIds: string[]
  selectedNodeIds: string[]
  selectedSummaryOwnerId: string | null
  editingNodeId: string | null
  searchQuery: string
  forcePreview: MindMapLayoutResult | null
  handlers: MindMapLayoutHandlers
  setNodes: Dispatch<SetStateAction<Node<MindMapNodeData>[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
  setLayoutDiagnostics: Dispatch<SetStateAction<MindMapLayoutDiagnostics | null>>
  setFeedback: (message: string) => void
}

function findDeepestVisibleLeaf(node: OutlineNode, visibleNodeIds: Set<string>): { node: OutlineNode; depth: number } {
  const visibleChildren = node.children.filter((child) => visibleNodeIds.has(child.id))
  if (visibleChildren.length === 0) return { node, depth: 0 }
  return visibleChildren.reduce<{ node: OutlineNode; depth: number }>((deepest, child) => {
    const candidate = findDeepestVisibleLeaf(child, visibleNodeIds)
    const withDepth = { node: candidate.node, depth: candidate.depth + 1 }
    return withDepth.depth >= deepest.depth ? withDepth : deepest
  }, { node, depth: 0 })
}

function collectVisibleTerminalNodes(node: OutlineNode, visibleNodeIds: Set<string>): OutlineNode[] {
  const visibleChildren = node.children.filter((child) => visibleNodeIds.has(child.id))
  if (visibleChildren.length === 0) return [node]
  return visibleChildren.flatMap((child) => collectVisibleTerminalNodes(child, visibleNodeIds))
}

function indexOutlineNodes(root: OutlineNode) {
  const nodeById = new Map<string, OutlineNode>()
  const visit = (node: OutlineNode) => {
    nodeById.set(node.id, node)
    node.children.forEach(visit)
  }
  visit(root)
  return nodeById
}

function buildSummaryTargets(root: OutlineNode, visibleNodeIds: Set<string>, nodeById: Map<string, OutlineNode>) {
  const targets = new Map<string, { ownerId: string; summary: NonNullable<OutlineNode['summary']> }>()
  const visit = (node: OutlineNode) => {
    if (node.summary) {
      const coveredRoots = node.summary.nodeIds.map((id) => nodeById.get(id)).filter((item): item is OutlineNode => Boolean(item))
      const target = (coveredRoots.length ? coveredRoots : [node])
        .map((covered) => findDeepestVisibleLeaf(covered, visibleNodeIds))
        .reduce((deepest, candidate) => candidate.depth >= deepest.depth ? candidate : deepest).node
      targets.set(target.id, { ownerId: node.id, summary: node.summary })
    }
    node.children.forEach(visit)
  }
  visit(root)
  return targets
}

export function useMindMapLayoutComputation({
  currentDoc,
  collapsedNodeIds,
  validFocusRootNodeId,
  exportClean,
  graphRootNode,
  measuredNodeSizes,
  measuredNodeSizeSignature,
  experimentalLayoutEnabled,
  layoutStrategy,
  depthByNodeId,
  visibleNodeIds,
  collapsedBranchSides,
  activeMatchNodeId,
  matchedNodeIds,
  selectedNodeIds,
  selectedSummaryOwnerId,
  editingNodeId,
  searchQuery,
  forcePreview,
  handlers,
  setNodes,
  setEdges,
  setLayoutDiagnostics,
  setFeedback,
}: UseMindMapLayoutComputationParams): void {
  const layoutDocument = React.useMemo(() => currentDoc ? {
    root: currentDoc.root,
    mindMapLayout: currentDoc.mindMapLayout,
    mindMapLayouts: currentDoc.mindMapLayouts,
  } : null, [currentDoc?.mindMapLayout, currentDoc?.mindMapLayouts, currentDoc?.root])
  const mindMapTheme = React.useMemo(
    () => resolveMindMapTheme(currentDoc?.mindMapAppearance?.themeId),
    [currentDoc?.mindMapAppearance?.themeId],
  )
  const themeLineColor = mindMapTheme.text

  const previewLayoutRoot = React.useMemo(() => {
    const root = graphRootNode ?? layoutDocument?.root
    if (!root) return null

    // 布局根节点保持稳定，避免初次渲染时坐标和连线短暂跳动。
    return root
  }, [graphRootNode, layoutDocument?.root])

  React.useEffect(() => {
    if (!layoutDocument) return

    const activeStrategy = experimentalLayoutEnabled ? layoutStrategy : DEFAULT_MIND_MAP_LAYOUT_STRATEGY
    const layoutRoot = previewLayoutRoot ?? graphRootNode ?? layoutDocument.root
    const graph = outlineToGraph(layoutRoot, collapsedNodeIds, undefined)
    const nodeSizes = buildMindMapNodeSizes(layoutRoot, measuredNodeSizes)
    const nodeById = indexOutlineNodes(layoutDocument.root)
    const matchedNodeIdSet = new Set(matchedNodeIds)
    const selectedNodeIdSet = new Set(selectedNodeIds)
    const summaryTargets = buildSummaryTargets(layoutDocument.root, visibleNodeIds, nodeById)
    // 先生成含预览节点的图，再统一交给布局引擎，避免预览节点绕过折叠、聚焦和搜索状态。
    const layoutInput: MindMapLayoutInput = {
      root: layoutRoot,
      graphData: {
        ...graph,
        nodes: graph.nodes.map((node) => {
          const sourceNode = nodeById.get(node.id)
          const data: MindMapNodeData = {
            label: sourceNode?.text ?? '',
            depth: depthByNodeId.get(node.id) ?? 0,
            childCount: sourceNode?.children.length ?? 0,
            visibleChildCount: sourceNode?.children.filter((child) => visibleNodeIds.has(child.id)).length ?? 0,
            collapsed: Boolean(sourceNode && collapsedNodeIds.has(sourceNode.id)),
            focused: node.id === validFocusRootNodeId,
            matched: !exportClean && matchedNodeIdSet.has(node.id),
            activeMatch: !exportClean && node.id === activeMatchNodeId,
            hasTags: Boolean(sourceNode?.tags?.length),
            note: sourceNode?.note,
            summary: summaryTargets.get(node.id)?.summary,
            summaryOwnerId: summaryTargets.get(node.id)?.ownerId,
            summarySelected: summaryTargets.get(node.id)?.ownerId === selectedSummaryOwnerId,
            checked: sourceNode?.checked,
            exportClean,
            dropState: null,
            editing: editingNodeId === node.id,
            format: sourceNode?.format,
            theme: mindMapTheme,
            onStartEditing: handlers.startEditing,
            onSelectNode: handlers.selectNode,
            leftBranchCollapsed: collapsedBranchSides.has(createBranchSideKey(node.id, 'left')),
            rightBranchCollapsed: collapsedBranchSides.has(createBranchSideKey(node.id, 'right')),
            onToggleBranchSide: handlers.toggleBranchSide,
            onToggleCollapse: handlers.toggleCollapse,
            onTextChange: handlers.updateNodeText,
            onCommitEdit: handlers.finishEditing,
            onCancelEdit: handlers.cancelEditing,
            onDeleteEmpty: handlers.handleDelete,
            onInsertSibling: handlers.insertSiblingAndEdit,
            onInsertChild: handlers.insertChildAndEdit,
            onIndent: handlers.indentNode,
            onOutdent: handlers.outdentNode,
            onMoveUp: (nodeId) => handlers.moveNode(nodeId, 'up'),
            onMoveDown: (nodeId) => handlers.moveNode(nodeId, 'down'),
          }

          return {
            ...node,
            data,
            selected: !exportClean && selectedNodeIdSet.has(node.id),
          }
        }),
      },
      collapsedNodeIds,
      visibleNodeIds: new Set(graph.nodes.map((node) => node.id)),
      strategy: activeStrategy,
      persistedLayout: getMindMapLayoutForStrategy(layoutDocument, activeStrategy),
      nodeSizes,
      mode: validFocusRootNodeId || searchQuery ? 'transient' : 'persistent',
    }
    const initialLayouted = forcePreview ?? layoutMindMap(layoutInput)
    const sideFilteredGraph = filterCollapsedBranchSides(
      layoutInput.graphData,
      initialLayouted.edges,
      collapsedBranchSides,
    )
    // 分支侧折叠依赖第一次布局后的连线方向，过滤节点后需要重新布局以收拢剩余分支。
    const layouted = sideFilteredGraph === layoutInput.graphData
      ? initialLayouted
      : layoutMindMap({
        ...layoutInput,
        graphData: sideFilteredGraph,
        visibleNodeIds: new Set(sideFilteredGraph.nodes.map((node) => node.id)),
      })

    if (layouted.diagnostics) {
      setLayoutDiagnostics(layouted.diagnostics)
      if (layouted.diagnostics.fallbackReason) {
        setFeedback(layouted.diagnostics.fallbackReason)
      }
    }

    const layoutNodeById = new Map<string, Node<MindMapNodeData>>((layouted.nodes as Node<MindMapNodeData>[]).map((node) => [node.id, node]))
    const layoutRootNode = layoutNodeById.get(layoutDocument.root.id)
    const nodesWithSummaryPlacement = layouted.nodes.map((node) => {
      const summary = node.data.summary
      if (!summary) return node
      const coveredNodes = summary.nodeIds
        .flatMap((id: string) => {
          const sourceNode = nodeById.get(id)
          return sourceNode ? collectVisibleTerminalNodes(sourceNode, visibleNodeIds) : []
        })
        .map((covered: OutlineNode) => layoutNodeById.get(covered.id))
        .filter((item: Node<MindMapNodeData> | undefined): item is Node<MindMapNodeData> => Boolean(item))
      const centerY = (covered: Node<MindMapNodeData>) => covered.position.y + (nodeSizes[covered.id]?.height ?? 36) / 2
      const coveredCenters = (coveredNodes.length ? coveredNodes : [node]).map(centerY)
      const firstCenter = Math.min(...coveredCenters)
      const lastCenter = Math.max(...coveredCenters)
      const midpoint = (firstCenter + lastCenter) / 2
      const summaryHeight = coveredNodes.length <= 1 ? 44 : Math.max(44, lastCenter - firstCenter)
      const nodeCenterX = node.position.x + (nodeSizes[node.id]?.width ?? 120) / 2
      const rootCenterX = layoutRootNode
        ? layoutRootNode.position.x + (nodeSizes[layoutRootNode.id]?.width ?? 120) / 2
        : nodeCenterX
      return {
        ...node,
        data: {
          ...node.data,
          summaryTop: midpoint - summaryHeight / 2 - node.position.y,
          summaryHeight,
          summarySide: nodeCenterX < rootCenterX ? 'left' : 'right',
        },
      }
    })
    setNodes(attachLayoutNodeSizes(nodesWithSummaryPlacement, nodeSizes))
    setEdges(layouted.edges.map((edge) => ({
      ...edge,
      style: {
        ...edge.style,
        stroke: themeLineColor,
      },
    })))
  }, [
    collapsedBranchSides,
    collapsedNodeIds,
    layoutDocument,
    depthByNodeId,
    experimentalLayoutEnabled,
    forcePreview,
    graphRootNode,
    handlers,
    layoutStrategy,
    measuredNodeSizeSignature,
    previewLayoutRoot,
    searchQuery,
    setEdges,
    setFeedback,
    setLayoutDiagnostics,
    setNodes,
    validFocusRootNodeId,
    visibleNodeIds,
  ])

  React.useEffect(() => {
    const matchedNodeIdSet = new Set(matchedNodeIds)
    const selectedNodeIdSet = new Set(selectedNodeIds)
    setNodes((currentNodes) => currentNodes.map((node) => {
      const nextSelected = !exportClean && selectedNodeIdSet.has(node.id)
      const nextMatched = !exportClean && matchedNodeIdSet.has(node.id)
      const nextActiveMatch = !exportClean && node.id === activeMatchNodeId
      const nextSummarySelected = node.data.summaryOwnerId === selectedSummaryOwnerId
      const nextEditing = editingNodeId === node.id
      if (
        node.selected === nextSelected
        && node.data.matched === nextMatched
        && node.data.activeMatch === nextActiveMatch
        && node.data.summarySelected === nextSummarySelected
        && node.data.editing === nextEditing
        && Boolean(node.data.exportClean) === exportClean
        && node.data.theme === mindMapTheme
      ) return node
      return {
        ...node,
        selected: nextSelected,
        data: {
          ...node.data,
          matched: nextMatched,
          activeMatch: nextActiveMatch,
          summarySelected: nextSummarySelected,
          editing: nextEditing,
          exportClean,
          theme: mindMapTheme,
        },
      }
    }))
  }, [activeMatchNodeId, editingNodeId, exportClean, matchedNodeIds, mindMapTheme, selectedNodeIds, selectedSummaryOwnerId, setNodes])

  React.useEffect(() => {
    setEdges((currentEdges) => currentEdges.map((edge) => edge.style?.stroke === themeLineColor
      ? edge
      : { ...edge, style: { ...edge.style, stroke: themeLineColor } }))
  }, [setEdges, themeLineColor])

}
