import { Edge as FlowEdge, Node as FlowNode } from 'reactflow'

import type {
  MindMapLayoutNodeState,
  MindMapLayoutPosition,
  MindMapLayoutState,
  MindMapLayoutStrategy,
  OutlineNode,
} from '../../../types/document'
import {
  MIND_MAP_LAYOUT_ENGINE_VERSION,
  normalizeMindMapLayoutState,
} from '../mindMapLayoutState'
import type {
  MindMapLayoutDiagnostics,
  MindMapLayoutInput,
  MindMapLayoutResult,
  MindMapNodeSize,
} from '../layoutEngine'

export const DEFAULT_NODE_SIZE: MindMapNodeSize = { width: 120, height: 36 }
export const MAX_ESTIMATED_NODE_WIDTH = 650
export const MIN_ESTIMATED_NODE_WIDTH = 44
export const CLASSIC_HORIZONTAL_GAP = 52
export const LEVEL_GAP = 164
export const SIBLING_GAP = 6
export const RADIAL_BASE_RADIUS = 220
export const RADIAL_LEVEL_RADIUS_GAP = 180
export const RADIAL_MIN_SECTOR_RADIANS = Math.PI / 10
export const FREE_CANVAS_CHILD_GAP_X = 156
export const FREE_CANVAS_CHILD_GAP_Y = 46

const DIAGNOSTIC_BOUNDS = 20000

export function estimateMindMapNodeSize(node: OutlineNode): MindMapNodeSize {
  const lines = node.text.split('\n')
  const fontSize = node.format?.fontSize ?? 14
  const longestLineUnits = Math.max(0, ...lines.map(estimateTextUnits))
  const textWidth = Math.min(
    MAX_ESTIMATED_NODE_WIDTH,
    Math.max(MIN_ESTIMATED_NODE_WIDTH, 14 + longestLineUnits * fontSize),
  )
  const availableLineUnits = Math.max(1, (textWidth - 14) / fontSize)
  const visualLineCount = lines.reduce(
    (count, line) => count + Math.max(1, Math.ceil(estimateTextUnits(line) / availableLineUnits)),
    0,
  )
  const metadataRows = [
    node.tags?.length ? 'tags' : '',
    node.note ? 'note' : '',
  ].filter(Boolean).length

  const imageCount = node.format?.imageDataUrls?.length ?? (node.format?.imageDataUrl ? 1 : 0)
  const imageHeight = imageCount ? Math.ceil(imageCount / 3) * 76 : 0
  const noteHeight = node.note ? 28 : 0
  const tableHeight = node.format?.table ? Math.max(48, node.format.table.length * 24 + 8) : 0
  const tableWidth = node.format?.table ? Math.max(140, Array.from({ length: node.format.table[0]?.length ?? 1 }, (_, columnIndex) => (
    Math.min(192, Math.max(64, ...node.format!.table!.map((row) => 24 + estimateTextUnits(row[columnIndex] ?? '') * 11)))
  )).reduce((sum, width) => sum + width, 0)) : 0
  return {
    width: Math.max(textWidth, imageCount ? 220 : 0, tableWidth),
    height: Math.max(DEFAULT_NODE_SIZE.height, 8 + visualLineCount * Math.ceil(fontSize * 1.45)) + metadataRows * 12 + noteHeight + imageHeight + tableHeight,
  }
}

function estimateTextUnits(text: string): number {
  return Array.from(text).reduce((units, character) => {
    if (/\s/.test(character)) return units + 0.34
    if (/[\u0000-\u024f]/.test(character)) return units + 0.56
    return units + 1
  }, 0)
}

export function createResult(
  input: MindMapLayoutInput,
  nodes: FlowNode[],
  edges: FlowEdge[],
  options: { sourceByNodeId?: Map<string, MindMapLayoutNodeState['source']> } = {},
): MindMapLayoutResult {
  if (input.mode === 'transient' || input.mode === 'preview') {
    return { nodes, edges }
  }

  // 只有持久模式写回布局状态；搜索和聚焦等临时视图不污染用户保存的坐标。
  return {
    nodes,
    edges,
    layoutState: {
      engineVersion: MIND_MAP_LAYOUT_ENGINE_VERSION,
      strategy: input.strategy,
      nodes: Object.fromEntries(nodes.map((node) => {
        const previous = input.persistedLayout?.nodes[node.id]
        return [node.id, {
          position: node.position,
          source: previous?.locked ? previous.source : previous?.source ?? options.sourceByNodeId?.get(node.id) ?? 'auto',
          locked: previous?.locked ?? false,
          updatedAt: previous?.updatedAt,
        }]
      })),
    },
  }
}

export function withDiagnostics(
  input: MindMapLayoutInput,
  result: MindMapLayoutResult,
  startedAt: number,
  fallbackReason?: string,
): MindMapLayoutResult {
  return {
    ...result,
    diagnostics: result.diagnostics ?? createDiagnostics(
      input.strategy,
      result.nodes,
      input.persistedLayout,
      input.nodeSizes,
      startedAt,
      fallbackReason,
    ),
  }
}

export function createDiagnostics(
  strategy: MindMapLayoutStrategy,
  nodes: FlowNode[],
  persistedLayout: MindMapLayoutState | undefined,
  nodeSizes: Record<string, MindMapNodeSize>,
  startedAt: number,
  fallbackReason?: string,
): MindMapLayoutDiagnostics {
  const lockedCount = Object.values(normalizeMindMapLayoutState(persistedLayout)?.nodes ?? {})
    .filter((state) => state.locked)
    .length
  const positionedNodes = nodes.filter((node) => Number.isFinite(node.position?.x) && Number.isFinite(node.position?.y))

  return {
    strategy,
    durationMs: Math.max(0, Math.round((now() - startedAt) * 100) / 100),
    nodeCount: nodes.length,
    positionedCount: positionedNodes.length,
    missingPositionCount: nodes.length - positionedNodes.length,
    lockedCount,
    overlapCount: countOverlaps(positionedNodes, nodeSizes),
    outOfBoundsCount: positionedNodes.filter((node) => (
      Math.abs(node.position.x) > DIAGNOSTIC_BOUNDS || Math.abs(node.position.y) > DIAGNOSTIC_BOUNDS
    )).length,
    fallbackReason,
  }
}

export function attachDirectionalEdgeHandles(
  edges: FlowEdge[],
  nodes: FlowNode[],
  nodeSizes: Record<string, MindMapNodeSize>,
  closestSide = false,
): FlowEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  return edges.map((edge) => {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)
    if (!source || !target) return edge

    const sourceWidth = resolveNodeSize(source.id, nodeSizes).width
    const targetWidth = resolveNodeSize(target.id, nodeSizes).width
    const sourceHeight = resolveNodeSize(source.id, nodeSizes).height
    const targetHeight = resolveNodeSize(target.id, nodeSizes).height
    const sourceCenterX = source.position.x + sourceWidth / 2
    const targetCenterX = target.position.x + targetWidth / 2
    const sourceCenterY = source.position.y + sourceHeight / 2
    const targetCenterY = target.position.y + targetHeight / 2
    const horizontalGap = Math.max(0, Math.abs(targetCenterX - sourceCenterX) - (sourceWidth + targetWidth) / 2)
    const verticalGap = Math.max(0, Math.abs(targetCenterY - sourceCenterY) - (sourceHeight + targetHeight) / 2)
    const overlapsHorizontally = horizontalGap === 0
    const overlapsVertically = verticalGap === 0
    const connectsVertically = overlapsHorizontally && !overlapsVertically
      || !overlapsHorizontally && !overlapsVertically && verticalGap < horizontalGap
      || overlapsHorizontally && overlapsVertically && Math.abs(targetCenterY - sourceCenterY) > Math.abs(targetCenterX - sourceCenterX)
    if (closestSide && connectsVertically) {
      const targetIsAbove = targetCenterY < sourceCenterY
      return {
        ...edge,
        sourceHandle: targetIsAbove ? 'top-source' : 'bottom-source',
        targetHandle: targetIsAbove ? 'bottom-target' : 'top-target',
      }
    }
    const targetIsLeft = targetCenterX < sourceCenterX

    return {
      ...edge,
      sourceHandle: targetIsLeft ? 'left-source' : 'right-source',
      targetHandle: targetIsLeft ? 'right-target' : 'left-target',
    }
  })
}

export function findOutlineNode(root: OutlineNode, nodeId: string): OutlineNode | null {
  if (root.id === nodeId) return root
  for (const child of root.children) {
    const found = findOutlineNode(child, nodeId)
    if (found) return found
  }
  return null
}

export function flattenOutlineNodes(root: OutlineNode): OutlineNode[] {
  return [root, ...root.children.flatMap(flattenOutlineNodes)]
}

export function deterministicAngle(nodeId: string, index: number, count: number): number {
  let hash = 0
  for (let charIndex = 0; charIndex < nodeId.length; charIndex += 1) {
    hash = (hash * 31 + nodeId.charCodeAt(charIndex)) >>> 0
  }
  return ((index / count) * Math.PI * 2) + (hash % 360) * Math.PI / 1800
}

export function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

export function resolveNodeSize(nodeId: string, sizes: Record<string, MindMapNodeSize>): MindMapNodeSize {
  return sizes[nodeId] ?? DEFAULT_NODE_SIZE
}

function countOverlaps(nodes: FlowNode[], nodeSizes: Record<string, MindMapNodeSize>): number {
  const gridSize = 256
  const grid = new Map<string, number[]>()
  const checkedPairs = new Set<string>()
  let count = 0

  nodes.forEach((node, nodeIndex) => {
    const size = resolveNodeSize(node.id, nodeSizes)
    const startColumn = Math.floor(node.position.x / gridSize)
    const endColumn = Math.floor((node.position.x + size.width) / gridSize)
    const startRow = Math.floor(node.position.y / gridSize)
    const endRow = Math.floor((node.position.y + size.height) / gridSize)

    for (let column = startColumn; column <= endColumn; column += 1) {
      for (let row = startRow; row <= endRow; row += 1) {
        const cellKey = `${column}:${row}`
        const occupants = grid.get(cellKey) ?? []
        occupants.forEach((otherIndex) => {
          const pairKey = `${otherIndex}:${nodeIndex}`
          if (checkedPairs.has(pairKey)) return
          checkedPairs.add(pairKey)
          if (rectanglesOverlap(nodes[otherIndex], node, nodeSizes)) count += 1
        })
        occupants.push(nodeIndex)
        grid.set(cellKey, occupants)
      }
    }
  })

  return count
}

function rectanglesOverlap(left: FlowNode, right: FlowNode, nodeSizes: Record<string, MindMapNodeSize>): boolean {
  const leftSize = resolveNodeSize(left.id, nodeSizes)
  const rightSize = resolveNodeSize(right.id, nodeSizes)
  return left.position.x < right.position.x + rightSize.width
    && left.position.x + leftSize.width > right.position.x
    && left.position.y < right.position.y + rightSize.height
    && left.position.y + leftSize.height > right.position.y
}
