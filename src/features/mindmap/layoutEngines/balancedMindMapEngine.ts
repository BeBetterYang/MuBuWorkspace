import { Position } from 'reactflow'

import type { MindMapLayoutPosition, MindMapLayoutState, OutlineNode } from '../../../types/document'
import type { MindMapLayoutEngine, MindMapLayoutInput } from '../layoutEngine'
import { normalizeMindMapLayoutState } from '../mindMapLayoutState'
import {
  attachDirectionalEdgeHandles,
  CLASSIC_HORIZONTAL_GAP,
  createResult,
  resolveNodeSize,
  SIBLING_GAP,
} from './shared'

export const balancedMindMapEngine: MindMapLayoutEngine = {
  layout(input) {
    const graphNodeIds = new Set(input.graphData.nodes.map((node) => node.id))
    const positions = new Map<string, MindMapLayoutPosition>()
    const persisted = normalizeMindMapLayoutState(input.persistedLayout)
    const visibleChildren = input.root.children.filter((child) => graphNodeIds.has(child.id))

    layoutBalancedRootMindMap({
      input,
      graphNodeIds,
      positions,
      persisted,
      visibleChildren,
    })

    const nodes = input.graphData.nodes.map((node) => ({
      ...node,
      targetPosition: (positions.get(node.id)?.x ?? 0) < 0 ? Position.Right : Position.Left,
      sourcePosition: (positions.get(node.id)?.x ?? 0) < 0 ? Position.Left : Position.Right,
      position: positions.get(node.id) ?? node.position,
    }))

    return createResult(input, nodes, attachDirectionalEdgeHandles(input.graphData.edges, nodes, input.nodeSizes))
  },
}

function layoutBalancedRootMindMap(params: {
  input: MindMapLayoutInput
  graphNodeIds: Set<string>
  positions: Map<string, MindMapLayoutPosition>
  persisted?: MindMapLayoutState
  visibleChildren: OutlineNode[]
}) {
  const { input, graphNodeIds, positions, persisted, visibleChildren } = params
  const rootSize = resolveNodeSize(input.root.id, input.nodeSizes)
  const savedNodes = persisted?.strategy === 'balanced-mindmap' ? persisted.nodes : {}
  const subtreeHeights = new Map<string, number>()

  measureVisibleSubtree(input.root, input, graphNodeIds, subtreeHeights)

  positions.set(input.root.id, savedNodes[input.root.id]?.locked
    ? savedNodes[input.root.id].position
    : { x: -rootSize.width / 2, y: -rootSize.height / 2 })

  const branches = splitBalancedBranches(visibleChildren, savedNodes)
  layoutBranchGroup({
    children: branches.left,
    side: 'left',
    parentNode: input.root,
    input,
    graphNodeIds,
    subtreeHeights,
    positions,
    savedNodes,
  })
  layoutBranchGroup({
    children: branches.right,
    side: 'right',
    parentNode: input.root,
    input,
    graphNodeIds,
    subtreeHeights,
    positions,
    savedNodes,
  })
}

function splitBalancedBranches(
  children: OutlineNode[],
  savedNodes: NonNullable<ReturnType<typeof normalizeMindMapLayoutState>>['nodes'],
): { left: OutlineNode[]; right: OutlineNode[] } {
  const left: OutlineNode[] = []
  const right: OutlineNode[] = []
  let leftWeight = 0
  let rightWeight = 0

  children.forEach((child, index) => {
    const weight = getSubtreeWeight(child)
    const savedPosition = savedNodes[child.id]?.position
    if (savedPosition) {
      if (savedPosition.x < 0) {
        left.push(child)
        leftWeight += weight
      } else {
        right.push(child)
        rightWeight += weight
      }
      return
    }
    const preferLeft = index % 2 === 0
    // 按子树规模动态分配左右分支，避免节点数量相同但内容深度差异导致一侧过重。
    if (leftWeight <= rightWeight && preferLeft || rightWeight > leftWeight) {
      left.push(child)
      leftWeight += weight
    } else {
      right.push(child)
      rightWeight += weight
    }
  })

  return { left, right }
}

function getSubtreeWeight(node: OutlineNode): number {
  return 1 + node.children.reduce((sum, child) => sum + getSubtreeWeight(child), 0)
}

function layoutBranchGroup(params: {
  children: OutlineNode[]
  side: 'left' | 'right'
  parentNode: OutlineNode
  input: MindMapLayoutInput
  graphNodeIds: Set<string>
  subtreeHeights: Map<string, number>
  positions: Map<string, MindMapLayoutPosition>
  savedNodes: NonNullable<ReturnType<typeof normalizeMindMapLayoutState>>['nodes']
}) {
  const totalHeight = params.children.reduce((sum, child, index) => (
    sum + (params.subtreeHeights.get(child.id) ?? 0) + (index === 0 ? 0 : SIBLING_GAP)
  ), 0)
  let cursorY = -totalHeight / 2

  params.children.forEach((child) => {
    const subtreeHeight = params.subtreeHeights.get(child.id) ?? resolveNodeSize(child.id, params.input.nodeSizes).height
    layoutSubtree({
      node: child,
      parentNode: params.parentNode,
      side: params.side,
      centerY: cursorY + subtreeHeight / 2,
      input: params.input,
      graphNodeIds: params.graphNodeIds,
      subtreeHeights: params.subtreeHeights,
      positions: params.positions,
      savedNodes: params.savedNodes,
    })
    cursorY += subtreeHeight + SIBLING_GAP
  })
}

function layoutSubtree(params: {
  node: OutlineNode
  parentNode: OutlineNode
  side: 'left' | 'right'
  centerY: number
  input: MindMapLayoutInput
  graphNodeIds: Set<string>
  subtreeHeights: Map<string, number>
  positions: Map<string, MindMapLayoutPosition>
  savedNodes: NonNullable<ReturnType<typeof normalizeMindMapLayoutState>>['nodes']
}) {
  if (!params.graphNodeIds.has(params.node.id)) return

  const size = resolveNodeSize(params.node.id, params.input.nodeSizes)
  const parentSize = resolveNodeSize(params.parentNode.id, params.input.nodeSizes)
  const parentPosition = params.positions.get(params.parentNode.id) ?? { x: 0, y: 0 }
  const x = params.side === 'left'
    ? parentPosition.x - CLASSIC_HORIZONTAL_GAP - size.width
    : parentPosition.x + parentSize.width + CLASSIC_HORIZONTAL_GAP
  const y = params.centerY - size.height / 2
  const persistedNode = params.savedNodes[params.node.id]
  params.positions.set(params.node.id, persistedNode?.locked ? persistedNode.position : { x, y })

  const children = params.node.children.filter((child) => params.graphNodeIds.has(child.id))
  const totalHeight = children.reduce((sum, child, index) => (
    sum + (params.subtreeHeights.get(child.id) ?? 0) + (index === 0 ? 0 : SIBLING_GAP)
  ), 0)
  let cursorY = params.centerY - totalHeight / 2

  children.forEach((child) => {
    const subtreeHeight = params.subtreeHeights.get(child.id) ?? resolveNodeSize(child.id, params.input.nodeSizes).height
    layoutSubtree({
      ...params,
      node: child,
      parentNode: params.node,
      centerY: cursorY + subtreeHeight / 2,
    })
    cursorY += subtreeHeight + SIBLING_GAP
  })
}

function measureVisibleSubtree(
  node: OutlineNode,
  input: MindMapLayoutInput,
  graphNodeIds: Set<string>,
  subtreeHeights: Map<string, number>,
): number {
  if (!graphNodeIds.has(node.id)) return 0
  const children = node.children.filter((child) => graphNodeIds.has(child.id))
  const childrenHeight = children.reduce((sum, child, index) => (
    sum + measureVisibleSubtree(child, input, graphNodeIds, subtreeHeights) + (index === 0 ? 0 : SIBLING_GAP)
  ), 0)
  const height = Math.max(resolveNodeSize(node.id, input.nodeSizes).height, childrenHeight)
  subtreeHeights.set(node.id, height)
  return height
}
