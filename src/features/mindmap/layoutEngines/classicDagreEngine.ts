import { Position } from 'reactflow'

import type { OutlineNode } from '../../../types/document'
import type { MindMapLayoutEngine, MindMapLayoutInput } from '../layoutEngine'
import { normalizeMindMapLayoutState } from '../mindMapLayoutState'
import {
  attachDirectionalEdgeHandles,
  CLASSIC_HORIZONTAL_GAP,
  createResult,
  resolveNodeSize,
  SIBLING_GAP,
} from './shared'

/**
 * The classic layout is parent-driven: every child begins the same fixed distance
 * after its own parent. Width changes therefore wrap downward instead of pushing an
 * entire rank (and all of its connectors) sideways.
 */
export const classicDagreEngine: MindMapLayoutEngine = {
  layout(input) {
    const visibleNodeIds = new Set(input.graphData.nodes.map((node) => node.id))
    const subtreeHeights = new Map<string, number>()
    const positions = new Map<string, { x: number; y: number }>()
    const normalizedLayout = input.persistedLayout?.strategy === 'classic-dagre'
      ? normalizeMindMapLayoutState(input.persistedLayout)
      : undefined

    measureVisibleSubtree(input.root, input, visibleNodeIds, subtreeHeights)
    const rootHeight = subtreeHeights.get(input.root.id) ?? resolveNodeSize(input.root.id, input.nodeSizes).height

    positionVisibleSubtree({
      node: input.root,
      input,
      visibleNodeIds,
      subtreeHeights,
      positions,
      x: 0,
      centerY: rootHeight / 2,
      savedNodes: normalizedLayout?.nodes ?? {},
    })

    const nodes = input.graphData.nodes.map((node) => ({
      ...node,
      position: positions.get(node.id) ?? node.position,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    }))
    const edges = attachDirectionalEdgeHandles(input.graphData.edges, nodes, input.nodeSizes)

    return createResult(input, nodes, edges)
  },
}

function measureVisibleSubtree(
  node: OutlineNode,
  input: MindMapLayoutInput,
  visibleNodeIds: Set<string>,
  subtreeHeights: Map<string, number>,
): number {
  if (!visibleNodeIds.has(node.id)) return 0

  const children = node.children.filter((child) => visibleNodeIds.has(child.id))
  const childrenHeight = children.reduce((height, child, index) => (
    height + measureVisibleSubtree(child, input, visibleNodeIds, subtreeHeights) + (index === 0 ? 0 : SIBLING_GAP)
  ), 0)
  const height = Math.max(resolveNodeSize(node.id, input.nodeSizes).height, childrenHeight)
  subtreeHeights.set(node.id, height)
  return height
}

function positionVisibleSubtree(params: {
  node: OutlineNode
  input: MindMapLayoutInput
  visibleNodeIds: Set<string>
  subtreeHeights: Map<string, number>
  positions: Map<string, { x: number; y: number }>
  x: number
  centerY: number
  savedNodes: NonNullable<ReturnType<typeof normalizeMindMapLayoutState>>['nodes']
}) {
  const {
    node, input, visibleNodeIds, subtreeHeights, positions, x, centerY, savedNodes,
  } = params
  if (!visibleNodeIds.has(node.id)) return

  const size = resolveNodeSize(node.id, input.nodeSizes)
  const saved = savedNodes[node.id]
  const position = saved?.locked
    ? saved.position
    : { x, y: centerY - size.height / 2 }
  positions.set(node.id, position)

  const children = node.children.filter((child) => visibleNodeIds.has(child.id))
  if (children.length === 0) return

  const childrenHeight = children.reduce((height, child, index) => (
    height + (subtreeHeights.get(child.id) ?? 0) + (index === 0 ? 0 : SIBLING_GAP)
  ), 0)
  let cursorY = centerY - childrenHeight / 2
  const childX = position.x + size.width + CLASSIC_HORIZONTAL_GAP

  children.forEach((child) => {
    const childHeight = subtreeHeights.get(child.id) ?? resolveNodeSize(child.id, input.nodeSizes).height
    positionVisibleSubtree({
      node: child,
      input,
      visibleNodeIds,
      subtreeHeights,
      positions,
      x: childX,
      centerY: cursorY + childHeight / 2,
      savedNodes,
    })
    cursorY += childHeight + SIBLING_GAP
  })
}
