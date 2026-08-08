import { describe, expect, it } from 'vitest'
import { createNode } from '../../test/fixtures'
import { outlineToGraph } from './outlineToGraph'
import {
  applyForceDirectedLayoutPreview,
  estimateMindMapNodeSize,
  layoutMindMap,
  relayoutMindMapBranch,
} from './layoutEngine'
import type { MindMapLayoutState } from '../../types/document'
import { CLASSIC_HORIZONTAL_GAP, SIBLING_GAP } from './layoutEngines/shared'

describe('layoutMindMap', () => {
  const root = createNode('root', 'Root', [
    createNode('a', 'A', [
      createNode('a-1', 'A1'),
      createNode('a-2', 'A2'),
    ]),
    createNode('b', 'B'),
    createNode('c', 'C', [
      createNode('c-1', 'C1'),
    ]),
  ])

  it('adapts classic dagre and returns persistent layout state', () => {
    const graphData = outlineToGraph(root, new Set())

    const result = layoutMindMap({
      root,
      graphData,
      collapsedNodeIds: new Set(),
      strategy: 'classic-dagre',
      nodeSizes: {},
      mode: 'persistent',
    })

    expect(result.nodes).toHaveLength(graphData.nodes.length)
    expect(result.edges.every((edge) => edge.type === 'step')).toBe(true)
    expect(result.edges.every((edge) => edge.style?.stroke === '#18181B')).toBe(true)
    expect(result.layoutState).toMatchObject({
      engineVersion: 3,
      strategy: 'classic-dagre',
    })
    expect(result.layoutState?.nodes.root.position).toEqual(result.nodes.find((node) => node.id === 'root')?.position)
  })

  it('left-aligns adaptive sibling boxes in classic layout ranks', () => {
    const adaptiveRoot = createNode('root', 'Root', [
      createNode('short', 'Short'),
      createNode('long', 'A much longer sibling label'),
    ])
    const result = layoutMindMap({
      root: adaptiveRoot,
      graphData: outlineToGraph(adaptiveRoot, new Set()),
      collapsedNodeIds: new Set(),
      strategy: 'classic-dagre',
      nodeSizes: {
        short: { width: 170, height: 44 },
        long: { width: 300, height: 44 },
      },
      mode: 'persistent',
    })
    const positionById = Object.fromEntries(result.nodes.map((node) => [node.id, node.position]))

    expect(positionById.short.x).toBe(positionById.long.x)
  })

  it('keeps the parent-to-child connector gap fixed for adaptive node widths', () => {
    const adaptiveRoot = createNode('root', 'Root', [
      createNode('short-parent', 'Short', [createNode('short-child', 'Child')]),
      createNode('wide-parent', 'A much wider parent', [createNode('wide-child', 'Child')]),
    ])
    const nodeSizes = {
      root: { width: 90, height: 36 },
      'short-parent': { width: 100, height: 36 },
      'short-child': { width: 80, height: 36 },
      'wide-parent': { width: 220, height: 36 },
      'wide-child': { width: 80, height: 36 },
    }
    const result = layoutMindMap({
      root: adaptiveRoot,
      graphData: outlineToGraph(adaptiveRoot, new Set()),
      collapsedNodeIds: new Set(),
      strategy: 'classic-dagre',
      nodeSizes,
      mode: 'persistent',
    })
    const positionById = Object.fromEntries(result.nodes.map((node) => [node.id, node.position]))

    expect(positionById['short-parent'].x - positionById.root.x - nodeSizes.root.width).toBe(CLASSIC_HORIZONTAL_GAP)
    expect(positionById['wide-parent'].x - positionById.root.x - nodeSizes.root.width).toBe(CLASSIC_HORIZONTAL_GAP)
    expect(positionById['short-child'].x - positionById['short-parent'].x - nodeSizes['short-parent'].width).toBe(CLASSIC_HORIZONTAL_GAP)
    expect(positionById['wide-child'].x - positionById['wide-parent'].x - nodeSizes['wide-parent'].width).toBe(CLASSIC_HORIZONTAL_GAP)
  })

  it('moves following branches downward when node content grows taller', () => {
    const adaptiveRoot = createNode('root', 'Root', [
      createNode('tall', 'Long wrapped content'),
      createNode('next', 'Next'),
    ])
    const nodeSizes = {
      root: { width: 90, height: 36 },
      tall: { width: 220, height: 104 },
      next: { width: 80, height: 36 },
    }
    const result = layoutMindMap({
      root: adaptiveRoot,
      graphData: outlineToGraph(adaptiveRoot, new Set()),
      collapsedNodeIds: new Set(),
      strategy: 'classic-dagre',
      nodeSizes,
      mode: 'persistent',
    })
    const positionById = Object.fromEntries(result.nodes.map((node) => [node.id, node.position]))

    expect(positionById.next.y).toBeGreaterThanOrEqual(positionById.tall.y + nodeSizes.tall.height + SIBLING_GAP)
  })

  it('balances first-level branches across both sides deterministically', () => {
    const graphData = outlineToGraph(root, new Set())
    const input = {
      root,
      graphData,
      collapsedNodeIds: new Set<string>(),
      strategy: 'balanced-mindmap' as const,
      nodeSizes: {},
      mode: 'persistent' as const,
    }

    const first = layoutMindMap(input)
    const second = layoutMindMap(input)
    const positionById = Object.fromEntries(first.nodes.map((node) => [node.id, node.position]))

    expect(positionById.root.x).toBeLessThanOrEqual(0)
    expect(positionById.a.x).toBeLessThan(0)
    expect(positionById.b.x).toBeGreaterThan(0)
    expect(first.nodes.map((node) => [node.id, node.position])).toEqual(
      second.nodes.map((node) => [node.id, node.position]),
    )
    expect(first.layoutState?.strategy).toBe('balanced-mindmap')
  })

  it('mirrors the classic parent-driven gap on both sides without overlaps', () => {
    const balancedRoot = createNode('root', 'Root', [
      createNode('left', 'Wide left parent', [createNode('left-child', 'Left child')]),
      createNode('right', 'Right parent', [createNode('right-child', 'Wide right child')]),
    ])
    const nodeSizes = {
      root: { width: 120, height: 44 },
      left: { width: 240, height: 64 },
      'left-child': { width: 110, height: 84 },
      right: { width: 140, height: 54 },
      'right-child': { width: 260, height: 74 },
    }
    const persistedLayout: MindMapLayoutState = {
      engineVersion: 3,
      strategy: 'balanced-mindmap',
      nodes: {
        left: { position: { x: -1, y: 0 }, source: 'auto', locked: false },
        right: { position: { x: 1, y: 0 }, source: 'auto', locked: false },
      },
    }
    const result = layoutMindMap({
      root: balancedRoot,
      graphData: outlineToGraph(balancedRoot, new Set()),
      collapsedNodeIds: new Set(),
      strategy: 'balanced-mindmap',
      persistedLayout,
      nodeSizes,
      mode: 'persistent',
    })
    const positionById = Object.fromEntries(result.nodes.map((node) => [node.id, node.position]))

    expect(positionById.root.x - (positionById.left.x + nodeSizes.left.width)).toBe(CLASSIC_HORIZONTAL_GAP)
    expect(positionById.left.x - (positionById['left-child'].x + nodeSizes['left-child'].width)).toBe(CLASSIC_HORIZONTAL_GAP)
    expect(positionById.right.x - (positionById.root.x + nodeSizes.root.width)).toBe(CLASSIC_HORIZONTAL_GAP)
    expect(positionById['right-child'].x - (positionById.right.x + nodeSizes.right.width)).toBe(CLASSIC_HORIZONTAL_GAP)

    expect(positionById.left.x + nodeSizes.left.width).toBeLessThan(positionById.root.x)
    expect(positionById.right.x).toBeGreaterThan(positionById.root.x + nodeSizes.root.width)
  })

  it('left-aligns adaptive sibling boxes in balanced layout columns', () => {
    const graphData = outlineToGraph(root, new Set())
    const result = layoutMindMap({
      root,
      graphData,
      collapsedNodeIds: new Set(),
      strategy: 'balanced-mindmap',
      nodeSizes: {
        b: { width: 170, height: 44 },
        c: { width: 300, height: 44 },
      },
      mode: 'persistent',
    })
    const positionById = Object.fromEntries(result.nodes.map((node) => [node.id, node.position]))

    expect(positionById.b.x).toBe(positionById.c.x)
  })

  it('uses the first-level root as the visual center in mind map layout', () => {
    const singleTopicRoot = createNode('root', 'Document', [
      createNode('topic', '408 数据结构', [
        createNode('linear-list', '线性表'),
        createNode('stack-queue', '栈和队列'),
        createNode('tree', '树'),
      ]),
    ])

    const result = layoutMindMap({
      root: singleTopicRoot,
      graphData: outlineToGraph(singleTopicRoot, new Set()),
      collapsedNodeIds: new Set(),
      strategy: 'balanced-mindmap',
      nodeSizes: {},
      mode: 'persistent',
    })
    const positionById = Object.fromEntries(result.nodes.map((node) => [node.id, node.position]))

    expect(Math.abs(positionById.root.x)).toBeLessThan(Math.abs(positionById.topic.x))
    expect(positionById.topic.x).toBeLessThan(positionById.root.x)
    expect(positionById['linear-list'].x).toBeLessThan(positionById.topic.x)
    expect(positionById['stack-queue'].x).toBeLessThan(positionById.topic.x)
  })

  it('anchors balanced layout edges to the side where the child branch is placed', () => {
    const singleTopicRoot = createNode('root', 'Document', [
      createNode('topic', '408 数据结构', [
        createNode('linear-list', '线性表'),
        createNode('stack-queue', '栈和队列'),
      ]),
    ])

    const result = layoutMindMap({
      root: singleTopicRoot,
      graphData: outlineToGraph(singleTopicRoot, new Set()),
      collapsedNodeIds: new Set(),
      strategy: 'balanced-mindmap',
      nodeSizes: {},
      mode: 'persistent',
    })
    const edgeById = Object.fromEntries(result.edges.map((edge) => [edge.id, edge]))

    expect(edgeById['topic-linear-list']).toMatchObject({
      sourceHandle: 'left-source',
      targetHandle: 'right-target',
    })
    expect(edgeById['topic-stack-queue']).toMatchObject({
      sourceHandle: 'left-source',
      targetHandle: 'right-target',
    })
  })

  it('preserves locked node positions from persisted layout', () => {
    const graphData = outlineToGraph(root, new Set())
    const persistedLayout: MindMapLayoutState = {
      engineVersion: 1,
      strategy: 'balanced-mindmap',
      nodes: {
        a: {
          position: { x: 999, y: 888 },
          source: 'manual',
          locked: true,
          updatedAt: 10,
        },
      },
    }

    const result = layoutMindMap({
      root,
      graphData,
      collapsedNodeIds: new Set(),
      strategy: 'balanced-mindmap',
      persistedLayout,
      nodeSizes: {},
      mode: 'persistent',
    })

    expect(result.nodes.find((node) => node.id === 'a')?.position).toEqual({ x: 999, y: 888 })
    expect(result.layoutState?.nodes.a).toMatchObject({
      position: { x: 999, y: 888 },
      source: 'manual',
      locked: true,
      updatedAt: 10,
    })
  })

  it('does not return persistent layout state in transient mode', () => {
    const result = layoutMindMap({
      root,
      graphData: outlineToGraph(root, new Set()),
      collapsedNodeIds: new Set(),
      strategy: 'balanced-mindmap',
      nodeSizes: {},
      mode: 'transient',
    })

    expect(result.layoutState).toBeUndefined()
  })

  it('lays out radial mind maps from the document root clockwise and deterministically', () => {
    const radialRoot = createNode('root', 'Root', [
      createNode('first', 'First'),
      createNode('second', 'Second'),
      createNode('third', 'Third'),
    ])
    const input = {
      root: radialRoot,
      graphData: outlineToGraph(radialRoot, new Set()),
      collapsedNodeIds: new Set<string>(),
      strategy: 'radial-mindmap' as const,
      nodeSizes: {},
      mode: 'persistent' as const,
    }

    const first = layoutMindMap(input)
    const second = layoutMindMap(input)
    const centerById = getCenterById(first.nodes)

    expect(centerById.root.x).toBeCloseTo(0)
    expect(centerById.root.y).toBeCloseTo(0)
    expect(centerById.first.x).toBeGreaterThan(centerById.root.x)
    expect(Math.abs(centerById.first.y)).toBeLessThan(1)
    expect(centerById.second.x).toBeLessThan(centerById.root.x)
    expect(centerById.second.y).toBeGreaterThan(centerById.root.y)
    expect(centerById.third.x).toBeLessThan(centerById.root.x)
    expect(centerById.third.y).toBeLessThan(centerById.root.y)
    expect(first.nodes.map((node) => [node.id, node.position])).toEqual(
      second.nodes.map((node) => [node.id, node.position]),
    )
    expect(first.layoutState).toMatchObject({
      engineVersion: 3,
      strategy: 'radial-mindmap',
    })
  })

  it('keeps radial child nodes inside their parent sector in outline order', () => {
    const radialRoot = createNode('root', 'Root', [
      createNode('topic', 'Topic', [
        createNode('topic-a', 'Topic A'),
        createNode('topic-b', 'Topic B'),
      ]),
      createNode('other', 'Other'),
    ])

    const result = layoutMindMap({
      root: radialRoot,
      graphData: outlineToGraph(radialRoot, new Set()),
      collapsedNodeIds: new Set(),
      strategy: 'radial-mindmap',
      nodeSizes: {},
      mode: 'persistent',
    })
    const centerById = getCenterById(result.nodes)

    expect(centerById.topic.x).toBeGreaterThan(centerById.root.x)
    expect(centerById['topic-a'].x).toBeGreaterThan(centerById.topic.x)
    expect(centerById['topic-b'].x).toBeGreaterThan(centerById.topic.x)
    expect(centerById['topic-a'].y).toBeLessThan(centerById.topic.y)
    expect(centerById['topic-b'].y).toBeGreaterThan(centerById.topic.y)
  })

  it('preserves locked radial nodes without moving automatic nodes', () => {
    const radialRoot = createNode('root', 'Root', [
      createNode('locked', 'Locked'),
      createNode('auto', 'Auto'),
    ])
    const baseInput = {
      root: radialRoot,
      graphData: outlineToGraph(radialRoot, new Set()),
      collapsedNodeIds: new Set<string>(),
      strategy: 'radial-mindmap' as const,
      nodeSizes: {},
      mode: 'persistent' as const,
    }
    const withoutLock = layoutMindMap(baseInput)
    const persistedLayout: MindMapLayoutState = {
      engineVersion: 2,
      strategy: 'radial-mindmap',
      nodes: {
        locked: {
          position: { x: 999, y: 888 },
          source: 'manual',
          locked: true,
          updatedAt: 10,
        },
      },
    }

    const withLock = layoutMindMap({
      ...baseInput,
      persistedLayout,
    })

    expect(withLock.nodes.find((node) => node.id === 'locked')?.position).toEqual({ x: 999, y: 888 })
    expect(withLock.nodes.find((node) => node.id === 'auto')?.position).toEqual(
      withoutLock.nodes.find((node) => node.id === 'auto')?.position,
    )
    expect(withLock.layoutState?.nodes.locked).toMatchObject({
      position: { x: 999, y: 888 },
      source: 'manual',
      locked: true,
      updatedAt: 10,
    })
  })

  it('estimates larger fallback sizes for nodes with rich content', () => {
    const plain = createNode('plain', '短')
    const rich = {
      ...createNode('rich', '这是一段明显更长的导图节点文本'),
      note: '备注',
      tags: ['项目'],
      checked: false,
    }

    expect(estimateMindMapNodeSize(rich).width).toBeGreaterThan(estimateMindMapNodeSize(plain).width)
    expect(estimateMindMapNodeSize(plain).width).toBeLessThan(160)
    expect(estimateMindMapNodeSize(rich).height).toBeGreaterThan(estimateMindMapNodeSize(plain).height)
  })

  it('estimates a taller node for explicit line breaks', () => {
    const singleLine = createNode('single', '第一行第二行第三行')
    const multiline = createNode('multiline', '第一行\n第二行\n第三行')

    expect(estimateMindMapNodeSize(multiline).height).toBeGreaterThan(estimateMindMapNodeSize(singleLine).height)
  })

  it('keeps free-canvas positions and deterministically places new nodes near their parent', () => {
    const freeRoot = createNode('root', 'Root', [
      createNode('parent', 'Parent', [
        createNode('existing', 'Existing'),
        createNode('new-child', 'New Child'),
      ]),
    ])
    const persistedLayout: MindMapLayoutState = {
      engineVersion: 3,
      strategy: 'free-canvas',
      nodes: {
        root: { position: { x: 0, y: 0 }, source: 'manual', locked: true },
        parent: { position: { x: 320, y: 40 }, source: 'manual', locked: true },
        existing: { position: { x: 620, y: 20 }, source: 'manual', locked: true },
      },
    }
    const input = {
      root: freeRoot,
      graphData: outlineToGraph(freeRoot, new Set()),
      collapsedNodeIds: new Set<string>(),
      strategy: 'free-canvas' as const,
      persistedLayout,
      nodeSizes: {},
      mode: 'persistent' as const,
    }

    const first = layoutMindMap(input)
    const second = layoutMindMap(input)

    expect(first.nodes.find((node) => node.id === 'parent')?.position).toEqual({ x: 320, y: 40 })
    expect(first.layoutState?.nodes['new-child']).toMatchObject({
      source: 'incremental',
      locked: false,
    })
    expect(first.layoutState?.nodes['new-child'].position.x).toBeGreaterThan(320)
    expect(first.layoutState?.nodes['new-child'].position).toEqual(second.layoutState?.nodes['new-child'].position)
  })

  it('connects free-canvas nodes through the nearest pair of sides', () => {
    const freeRoot = createNode('root', 'Root', [createNode('below', 'Below')])
    const result = layoutMindMap({
      root: freeRoot,
      graphData: outlineToGraph(freeRoot, new Set()),
      collapsedNodeIds: new Set(),
      strategy: 'free-canvas',
      persistedLayout: {
        engineVersion: 3,
        strategy: 'free-canvas',
        nodes: {
          root: { position: { x: 0, y: 0 }, source: 'manual', locked: true },
          below: { position: { x: 10, y: 300 }, source: 'manual', locked: true },
        },
      },
      nodeSizes: {
        root: { width: 120, height: 44 },
        below: { width: 120, height: 44 },
      },
      mode: 'persistent',
    })

    expect(result.edges[0]).toMatchObject({
      type: 'step',
      sourceHandle: 'bottom-source',
      targetHandle: 'top-target',
    })
  })

  it('relayouts only unlocked descendants by default', () => {
    const branchRoot = createNode('root', 'Root', [
      createNode('branch', 'Branch', [
        createNode('locked-child', 'Locked'),
        createNode('free-child', 'Free'),
      ]),
    ])
    const persistedLayout: MindMapLayoutState = {
      engineVersion: 3,
      strategy: 'free-canvas',
      nodes: {
        root: { position: { x: 0, y: 0 }, source: 'manual', locked: true },
        branch: { position: { x: 100, y: 100 }, source: 'manual', locked: true },
        'locked-child': { position: { x: 900, y: 900 }, source: 'manual', locked: true },
        'free-child': { position: { x: 10, y: 10 }, source: 'manual', locked: false },
      },
    }

    const next = relayoutMindMapBranch({
      root: branchRoot,
      branchRootId: 'branch',
      layout: persistedLayout,
      nodeSizes: {},
      strategy: 'free-canvas',
    })

    expect(next.nodes.branch.position).toEqual({ x: 100, y: 100 })
    expect(next.nodes['locked-child'].position).toEqual({ x: 900, y: 900 })
    expect(next.nodes['free-child'].position).not.toEqual({ x: 10, y: 10 })
    expect(next.nodes['free-child'].source).toBe('incremental')
  })

  it('creates deterministic force-directed previews and applies only unlocked nodes', () => {
    const forceRoot = createNode('root', 'Root', [
      createNode('locked', 'Locked'),
      createNode('free', 'Free'),
    ])
    const persistedLayout: MindMapLayoutState = {
      engineVersion: 3,
      strategy: 'free-canvas',
      nodes: {
        root: { position: { x: 0, y: 0 }, source: 'manual', locked: true },
        locked: { position: { x: 100, y: 100 }, source: 'manual', locked: true },
        free: { position: { x: 200, y: 200 }, source: 'manual', locked: false },
      },
    }

    const first = applyForceDirectedLayoutPreview({
      root: forceRoot,
      layout: persistedLayout,
      nodeSizes: {},
      params: { strength: 2, spread: 2, quality: 2 },
      mode: 'preview',
    })
    const second = applyForceDirectedLayoutPreview({
      root: forceRoot,
      layout: persistedLayout,
      nodeSizes: {},
      params: { strength: 2, spread: 2, quality: 2 },
      mode: 'preview',
    })
    const applied = applyForceDirectedLayoutPreview({
      root: forceRoot,
      layout: persistedLayout,
      nodeSizes: {},
      params: { strength: 2, spread: 2, quality: 2 },
      mode: 'apply',
    })

    expect(first.layoutState).toBeUndefined()
    expect(first.nodes.map((node) => [node.id, node.position])).toEqual(
      second.nodes.map((node) => [node.id, node.position]),
    )
    expect(first.nodes.find((node) => node.id === 'locked')?.position).toEqual({ x: 100, y: 100 })
    expect(applied.layoutState?.nodes.locked).toMatchObject({ position: { x: 100, y: 100 }, locked: true })
    expect(applied.layoutState?.nodes.free.source).toBe('force-applied')
  })

  it('returns structured diagnostics for layout coverage and coordinate quality', () => {
    const result = layoutMindMap({
      root,
      graphData: outlineToGraph(root, new Set()),
      collapsedNodeIds: new Set(),
      strategy: 'balanced-mindmap',
      nodeSizes: {},
      mode: 'persistent',
    })

    expect(result.diagnostics).toMatchObject({
      strategy: 'balanced-mindmap',
      nodeCount: result.nodes.length,
      positionedCount: result.nodes.length,
      missingPositionCount: 0,
    })
  })
})

function getCenterById(nodes: Array<{ id: string; position: { x: number; y: number } }>) {
  return Object.fromEntries(nodes.map((node) => [node.id, {
    x: node.position.x + 60,
    y: node.position.y + 18,
  }]))
}
