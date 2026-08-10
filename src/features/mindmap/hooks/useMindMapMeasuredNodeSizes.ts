import React from 'react'
import type { Node } from 'reactflow'
import type { MindMapLayoutDiagnostics, MindMapNodeSize } from '../layoutEngine'
import type { MindMapNodeData } from '../MindMapNode'
import type { MindMapMode } from '../MindMapToolbar'

export function useMindMapMeasuredNodeSizes(
  mode: MindMapMode,
  nodes: Node<MindMapNodeData>[],
) {
  const cacheRef = React.useRef<{
    measuredNodeSizes: Record<string, MindMapNodeSize>
    measuredNodeSizeSignature: string
  }>({ measuredNodeSizes: {}, measuredNodeSizeSignature: '' })

  return React.useMemo(() => {
    // Reorganizing only changes positions. Reusing the last measured dimensions
    // keeps pointer movement from rebuilding and sorting a full size signature.
    if (mode === 'reorganize') return cacheRef.current

    const measuredNodeSizes = nodes.reduce<Record<string, MindMapNodeSize>>((sizes, node) => {
      if (typeof node.width === 'number' && typeof node.height === 'number') {
        sizes[node.id] = { width: node.width, height: node.height }
      }
      return sizes
    }, {})
    const measuredNodeSizeSignature = Object.entries(measuredNodeSizes)
      .map(([nodeId, size]) => `${nodeId}:${size.width}x${size.height}`)
      .join('|')
    if (cacheRef.current.measuredNodeSizeSignature !== measuredNodeSizeSignature) {
      cacheRef.current = { measuredNodeSizes, measuredNodeSizeSignature }
    }
    return cacheRef.current
  }, [mode, nodes])
}

export type { MindMapLayoutDiagnostics, MindMapNodeSize }
