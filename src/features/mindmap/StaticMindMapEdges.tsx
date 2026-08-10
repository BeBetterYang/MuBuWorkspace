import React from 'react'
import type { Edge, Node } from 'reactflow'

interface StaticMindMapEdgeBundleData {
  path: string
  stroke: string
  strokeWidth: number
}

type AnchorSide = 'left' | 'right' | 'top' | 'bottom'

const FALLBACK_NODE_WIDTH = 120
const FALLBACK_NODE_HEIGHT = 36

function resolveAnchor(node: Node, handleId: string | null | undefined) {
  const width = node.width ?? FALLBACK_NODE_WIDTH
  const height = node.height ?? FALLBACK_NODE_HEIGHT
  const side: AnchorSide = handleId?.startsWith('left')
    ? 'left'
    : handleId?.startsWith('top')
      ? 'top'
      : handleId?.startsWith('bottom')
        ? 'bottom'
        : 'right'

  if (side === 'left') return { x: node.position.x, y: node.position.y + height / 2, side }
  if (side === 'top') return { x: node.position.x + width / 2, y: node.position.y, side }
  if (side === 'bottom') return { x: node.position.x + width / 2, y: node.position.y + height, side }
  return { x: node.position.x + width, y: node.position.y + height / 2, side }
}

export function buildStaticMindMapPath(nodes: Node[], edges: Edge[]): string {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const segments: string[] = []

  for (const edge of edges) {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)
    if (!source || !target) continue

    const start = resolveAnchor(source, edge.sourceHandle)
    const end = resolveAnchor(target, edge.targetHandle)
    const horizontal = start.side === 'left' || start.side === 'right'

    if (horizontal) {
      const middleX = (start.x + end.x) / 2
      segments.push(`M ${start.x} ${start.y} H ${middleX} V ${end.y} H ${end.x}`)
    } else {
      const middleY = (start.y + end.y) / 2
      segments.push(`M ${start.x} ${start.y} V ${middleY} H ${end.x} V ${end.y}`)
    }
  }

  return segments.join(' ')
}

export function createStaticMindMapEdgeBundle(nodes: Node[], edges: Edge[]): Edge<StaticMindMapEdgeBundleData>[] {
  if (edges.length === 0) return []
  const firstEdge = edges[0]
  const path = buildStaticMindMapPath(nodes, edges)
  if (!path) return []

  return [{
    id: '__mindmap-static-edge-layer__',
    source: firstEdge.source,
    target: firstEdge.target,
    sourceHandle: firstEdge.sourceHandle,
    targetHandle: firstEdge.targetHandle,
    hidden: true,
    interactionWidth: 0,
    style: {
      stroke: firstEdge.style?.stroke ?? '#18181B',
      strokeWidth: firstEdge.style?.strokeWidth ?? 1.5,
    },
    data: {
      path,
      stroke: String(firstEdge.style?.stroke ?? '#18181B'),
      strokeWidth: Number(firstEdge.style?.strokeWidth ?? 1.5),
    },
  }]
}

interface StaticMindMapEdgeLayerProps {
  nodes: Node[]
  edges: Edge[]
}

export const StaticMindMapEdgeLayer = React.memo(function StaticMindMapEdgeLayer({ nodes, edges }: StaticMindMapEdgeLayerProps) {
  const path = React.useMemo(() => buildStaticMindMapPath(nodes, edges), [edges, nodes])
  const stroke = String(edges[0]?.style?.stroke ?? '#18181B')
  const strokeWidth = Number(edges[0]?.style?.strokeWidth ?? 1.5)
  if (!path) return null
  return (
    <path
      className="react-flow__edge-path mindmap-static-edge-layer"
      d={path}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      pointerEvents="none"
    />
  )
})
