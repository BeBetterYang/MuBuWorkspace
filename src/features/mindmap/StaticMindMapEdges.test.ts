import { describe, expect, it } from 'vitest'
import type { Edge, Node } from 'reactflow'
import { buildStaticMindMapPath, createStaticMindMapEdgeBundle } from './StaticMindMapEdges'

const nodes: Node[] = [
  { id: 'root', position: { x: 0, y: 20 }, width: 100, height: 40, data: {} },
  { id: 'right', position: { x: 180, y: 0 }, width: 80, height: 40, data: {} },
  { id: 'left', position: { x: -160, y: 80 }, width: 80, height: 40, data: {} },
]

const edges: Edge[] = [
  { id: 'root-right', source: 'root', target: 'right', sourceHandle: 'right-source', targetHandle: 'left-target' },
  { id: 'root-left', source: 'root', target: 'left', sourceHandle: 'left-source', targetHandle: 'right-target' },
]

describe('StaticMindMapEdges', () => {
  it('combines orthogonal connections into one SVG path', () => {
    expect(buildStaticMindMapPath(nodes, edges)).toBe(
      'M 100 40 H 140 V 20 H 180 M 0 40 H -40 V 100 H -80',
    )
  })

  it('creates one non-interactive edge for the complete map', () => {
    const bundle = createStaticMindMapEdgeBundle(nodes, edges)
    expect(bundle).toHaveLength(1)
    expect(bundle[0]).toMatchObject({
      id: '__mindmap-static-edge-layer__',
      hidden: true,
      interactionWidth: 0,
    })
  })
})
