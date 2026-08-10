import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDocument, createNode } from '../../test/fixtures'
import { useDocumentStore } from '../document/documentStore'
import { useSettingsStore } from '../settings/settingsStore'
import { MindMapView } from './MindMapView'
import { DEFAULT_SETTINGS } from '../../types/settings'

const flowViewportSpies = vi.hoisted(() => ({
  setCenter: vi.fn(),
  setViewport: vi.fn(),
}))

vi.mock('reactflow', async () => {
  const React = await import('react')

  interface MockFlowNode {
    id: string
    type: string
    data: unknown
    selected?: boolean
    position?: { x: number; y: number }
    width?: number
    height?: number
  }

  interface MockReactFlowProps {
    nodes: MockFlowNode[]
    edges: Array<{ style?: React.CSSProperties }>
    nodeTypes: Record<string, React.ComponentType<{ id: string; data: unknown; selected?: boolean; type: string; isConnectable?: boolean }>>
    nodesDraggable?: boolean
    nodesConnectable?: boolean
    onConnect?: (connection: { source: string; target: string; sourceHandle: string; targetHandle: string }) => void
    onNodeClick?: (event: React.MouseEvent, node: MockFlowNode) => void
    onNodeDoubleClick?: (event: React.MouseEvent, node: MockFlowNode) => void
    onNodeContextMenu?: (event: React.MouseEvent, node: MockFlowNode) => void
    onNodeDragStop?: (event: React.MouseEvent, node: MockFlowNode, nodes: MockFlowNode[]) => void
    onNodeDrag?: (event: React.MouseEvent, node: MockFlowNode) => void
    onNodeDragStart?: (event: React.MouseEvent, node: MockFlowNode) => void
    onInit?: (instance: { setCenter: ReturnType<typeof vi.fn>; setViewport: ReturnType<typeof vi.fn> }) => void
    onMoveEnd?: (event: null, viewport: { x: number; y: number; zoom: number }) => void
    onPaneClick?: () => void
    onKeyDown?: (event: React.KeyboardEvent) => void
    children?: React.ReactNode
  }

  return {
    __esModule: true,
    default: ({
      nodes,
      edges,
      nodeTypes,
      onNodeClick,
      onNodeDoubleClick,
      onNodeContextMenu,
      onNodeDrag,
      onNodeDragStart,
      onNodeDragStop,
      onInit,
      onMoveEnd,
      onPaneClick,
      onKeyDown,
      children,
      nodesDraggable,
      nodesConnectable,
      onConnect,
    }: MockReactFlowProps) => {
      React.useEffect(() => {
        onInit?.(flowViewportSpies)
      }, [onInit])

      return (
        <div
          data-testid="react-flow"
          data-nodes-draggable={String(nodesDraggable)}
          data-nodes-connectable={String(nodesConnectable)}
          data-edge-stroke={String(edges[0]?.style?.stroke ?? '')}
          tabIndex={0}
          onClick={onPaneClick}
          onKeyDown={onKeyDown}
        >
          {nodes.map((node) => {
            const NodeComponent = nodeTypes[node.type]
            return (
              <div
                key={node.id}
                data-testid={`flow-node-${node.id}`}
                data-position-x={node.position?.x}
                data-position-y={node.position?.y}
                data-width={node.width}
                data-height={node.height}
                onClick={(event) => {
                  event.stopPropagation()
                  onNodeClick?.(event, node)
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation()
                  onNodeDoubleClick?.(event, node)
                }}
                onContextMenu={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onNodeContextMenu?.(event, node)
                }}
                onDragStart={(event) => {
                  event.stopPropagation()
                  onNodeDragStart?.(event, node)
                }}
                onDrag={(event) => {
                  event.stopPropagation()
                  const targetNode = nodes.find((currentNode) => currentNode.id === 'node-1')
                  onNodeDrag?.(event, {
                    ...node,
                    position: targetNode?.position ?? node.position ?? { x: 0, y: 0 },
                    width: targetNode?.width ?? 200,
                    height: targetNode?.height ?? 44,
                  })
                }}
                onDragEnd={(event) => {
                  event.stopPropagation()
                  const isReorganizeMode = document
                    .querySelector('[aria-label="重组"]')
                    ?.className.includes('bg-[var(--color-tint-lavender)]') ?? false
                  const targetNode = nodes.find((currentNode) => currentNode.id === 'node-1')
                  const draggedPosition = isReorganizeMode && targetNode
                    ? targetNode.position ?? { x: 0, y: 0 }
                    : { x: 333, y: 222 }
                  const measuredNodes = nodes.map((currentNode) => ({
                    ...currentNode,
                    width: currentNode.width ?? 200,
                    height: currentNode.height ?? 44,
                  }))
                  onNodeDragStop?.(event, {
                    ...node,
                    position: draggedPosition,
                    width: targetNode?.width ?? 200,
                    height: targetNode?.height ?? 44,
                  }, measuredNodes)
                }}
                draggable
              >
                <NodeComponent id={node.id} data={node.data} selected={node.selected} type={node.type} isConnectable={nodesConnectable} />
              </div>
            )
          })}
          <button
            type="button"
            data-testid="flow-connect-node-1-to-node-2"
            onClick={(event) => {
              event.stopPropagation()
              onConnect?.({
                source: 'node-1',
                target: 'node-2',
                sourceHandle: 'left-source',
                targetHandle: 'left-source',
              })
            }}
          />
          {children}
          <button type="button" data-testid="flow-move-end" onClick={(event) => { event.stopPropagation(); onMoveEnd?.(null, { x: 24, y: 36, zoom: 1.25 }) }} />
        </div>
      )
    },
    Handle: ({ id, onClick, style }: { id?: string; onClick?: React.MouseEventHandler; style?: React.CSSProperties }) => (
      <span data-testid={`flow-handle-${id}`} onClick={onClick} style={style} />
    ),
    Position: { Left: 'left', Right: 'right' },
    ConnectionMode: { Loose: 'loose' },
    MiniMap: () => <div data-testid="flow-minimap" />,
    Controls: ({ showInteractive = true }: { showInteractive?: boolean }) => showInteractive
      ? <button type="button" data-testid="flow-controls">toggle interactivity</button>
      : null,
    Background: () => <div data-testid="flow-background" />,
    useNodesState: (initial: MockFlowNode[]) => {
      const [nodes, setNodes] = React.useState(initial)
      return [nodes, setNodes, vi.fn()]
    },
    useEdgesState: (initial: unknown[]) => {
      const [edges, setEdges] = React.useState(initial)
      return [edges, setEdges, vi.fn()]
    },
    useStore: (selector: (state: { transform: [number, number, number] }) => unknown) => selector({ transform: [0, 0, 1] }),
  }
})
function expandMindMapToolbar() {
  const expandButton = screen.queryByRole('button', { name: '展开导图工具' })
  if (expandButton) fireEvent.click(expandButton)
}

describe('MindMapView', () => {
  beforeEach(() => {
    flowViewportSpies.setCenter.mockReset()
    flowViewportSpies.setViewport.mockReset()
    useDocumentStore.setState({
      currentDoc: createDocument(),
      viewMode: 'mindmap',
      selectedNodeId: null,
      collapsedNodeIds: new Set<string>(),
      isDirty: false,
      saveStatus: 'idle',
      currentFilePath: null,
      filter: { query: '', tag: null, checked: 'all' },
      focusedNodeId: null,
      focusRequestSeq: 0,
      canUndo: false,
      canRedo: false,
      undoStack: [],
      redoStack: [],
      cleanSnapshotKey: null,
      activeTextEditSession: null,
      outlineSelection: { anchorNodeId: null, selectedNodeIds: [] },
    })
    useSettingsStore.setState({
      settings: DEFAULT_SETTINGS,
      isLoaded: false,
      isSaving: false,
      error: null,
    })
  })

  it('opens a context menu with root-only disabled operations', () => {
    render(<MindMapView />)

    fireEvent.contextMenu(screen.getByTestId('flow-node-root'))

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '新增同级节点' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: '删除节点' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: '新增子节点' })).toBeEnabled()
  })

  it('renames a node from double click inline editing', () => {
    render(<MindMapView />)

    fireEvent.doubleClick(screen.getByTestId('flow-node-node-2'))
    const input = screen.getByDisplayValue('第二节点')
    fireEvent.change(input, { target: { value: '导图重命名' } })
    fireEvent.blur(input)

    expect(useDocumentStore.getState().currentDoc?.root.children[1].text).toBe('导图重命名')
    expect(useDocumentStore.getState().selectedNodeId).toBe('node-2')
    expect(screen.queryByDisplayValue('导图重命名')).not.toBeInTheDocument()
  })

  it('edits the title row directly without hiding description or table content', async () => {
    useDocumentStore.setState((state) => ({
      currentDoc: state.currentDoc ? {
        ...state.currentDoc,
        root: {
          ...state.currentDoc.root,
          children: state.currentDoc.root.children.map((node) => node.id === 'node-2' ? {
            ...node,
            note: '保留的描述',
            format: { ...node.format, table: [['表格内容']] },
          } : node),
        },
      } : null,
    }))
    render(<MindMapView />)

    fireEvent.click(screen.getByText('第二节点'))

    await waitFor(() => expect(screen.getByRole('textbox', { name: '编辑节点文本' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '保留的描述' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '表格第1行第1列' })).toBeInTheDocument()
  })

  it('restores the saved viewport and persists the last viewport per layout', async () => {
    useDocumentStore.setState((state) => ({
      currentDoc: state.currentDoc ? {
        ...state.currentDoc,
        mindMapViewports: { 'classic-dagre': { x: 80, y: 120, zoom: 0.8 } },
      } : null,
    }))
    render(<MindMapView />)

    await waitFor(() => expect(flowViewportSpies.setViewport).toHaveBeenCalledWith({ x: 80, y: 120, zoom: 0.8 }, { duration: 0 }))
    fireEvent.click(screen.getByTestId('flow-move-end'))
    expect(useDocumentStore.getState().currentDoc?.mindMapViewports?.['classic-dagre']).toEqual({ x: 24, y: 36, zoom: 1.25 })
  })

  it('focuses the first level node at 100% when the document has no saved viewport', async () => {
    render(<MindMapView />)

    await waitFor(() => expect(flowViewportSpies.setCenter).toHaveBeenCalled())
    const firstLevelNode = screen.getByTestId('flow-node-node-1')
    expect(flowViewportSpies.setCenter).toHaveBeenCalledWith(
      Number(firstLevelNode.dataset.positionX) + Number(firstLevelNode.dataset.width) / 2,
      Number(firstLevelNode.dataset.positionY) + Number(firstLevelNode.dataset.height) / 2,
      { zoom: 1, duration: 180 },
    )
  })

  it('keeps the formatting toolbar hidden until a node is clicked', () => {
    render(<MindMapView />)

    expect(screen.queryByRole('button', { name: '文字格式' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('flow-node-node-2'))
    expect(screen.getByRole('button', { name: '文字格式' })).toBeInTheDocument()
  })

  it('deletes the selected leaf node with Delete', () => {
    render(<MindMapView />)

    fireEvent.click(screen.getByTestId('flow-node-node-2'))
    fireEvent.keyDown(screen.getByTestId('react-flow'), { key: 'Delete' })

    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual(['node-1'])
  })

  it('keeps the edited node selected so the next Enter inserts a sibling', () => {
    render(<MindMapView />)

    fireEvent.doubleClick(screen.getByTestId('flow-node-node-2'))
    fireEvent.keyDown(screen.getByRole('textbox', { name: '编辑节点文本' }), { key: 'Enter' })
    expect(useDocumentStore.getState().selectedNodeId).toBe('node-2')

    fireEvent.keyDown(screen.getByTestId('react-flow'), { key: 'Enter' })
    expect(useDocumentStore.getState().currentDoc?.root.children).toHaveLength(3)
  })

  it('supports ctrl multi-selection and bulk text formatting', () => {
    render(<MindMapView />)

    fireEvent.click(screen.getByTestId('flow-node-node-1'), { ctrlKey: true })
    fireEvent.click(screen.getByTestId('flow-node-node-2'), { ctrlKey: true })
    expect(screen.getByText('2 项')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '文字格式' }))
    fireEvent.click(screen.getByRole('button', { name: '18' }))

    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.format?.fontSize)).toEqual([18, 18])
  })

  it('toggles todo visibility without changing completion and edits the description inside the node', () => {
    render(<MindMapView />)

    fireEvent.click(screen.getByTestId('flow-node-node-2'))
    fireEvent.click(screen.getByRole('button', { name: '待办' }))
    expect(useDocumentStore.getState().currentDoc?.root.children[1].checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '标记为已完成' }))
    expect(useDocumentStore.getState().currentDoc?.root.children[1].checked).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '待办' }))
    expect(useDocumentStore.getState().currentDoc?.root.children[1].checked).toBeUndefined()

    fireEvent.click(screen.getByRole('button', { name: '编辑描述' }))
    const description = screen.getByRole('textbox', { name: '节点描述' })
    fireEvent.change(description, { target: { value: '节点内描述' } })
    fireEvent.keyDown(description, { key: 'Enter' })
    expect(useDocumentStore.getState().currentDoc?.root.children[1].note).toBe('节点内描述')
    expect(screen.getByRole('button', { name: '节点内描述' })).toBeInTheDocument()
  })

  it('adds a table inline and only removes it after confirmation', () => {
    const confirm = vi.spyOn(window, 'confirm')
    render(<MindMapView />)

    fireEvent.click(screen.getByTestId('flow-node-node-2'))
    fireEvent.click(screen.getByRole('button', { name: '插入表格' }))
    expect(screen.getByRole('textbox', { name: '表格第1行第1列' })).toBeInTheDocument()
    expect(screen.queryByText('删除表格')).not.toBeInTheDocument()

    confirm.mockReturnValueOnce(false)
    fireEvent.click(screen.getByRole('button', { name: '插入表格' }))
    expect(useDocumentStore.getState().currentDoc?.root.children[1].format?.table).toBeDefined()

    confirm.mockReturnValueOnce(true)
    fireEvent.click(screen.getByRole('button', { name: '插入表格' }))
    expect(useDocumentStore.getState().currentDoc?.root.children[1].format?.table).toBeUndefined()
  })

  it('adds one summary for selected siblings and keeps it on the deepest leaf', async () => {
    render(<MindMapView />)

    fireEvent.click(screen.getByTestId('flow-node-node-1'), { ctrlKey: true })
    fireEvent.click(screen.getByTestId('flow-node-node-2'), { ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '概要' }))
    fireEvent.change(screen.getByRole('textbox', { name: '概要内容' }), { target: { value: '阶段概要' } })

    expect(useDocumentStore.getState().currentDoc?.root.children[0].summary).toEqual({
      text: '阶段概要',
      nodeIds: ['node-1', 'node-2'],
    })
    const summaryLabel = within(screen.getByTestId('mindmap-node-node-1-1')).getByText('阶段概要')
    expect(summaryLabel).toBeInTheDocument()
    const firstNode = screen.getByTestId('flow-node-node-1')
    const lastNode = screen.getByTestId('flow-node-node-2')
    const firstCenter = Number(firstNode.dataset.positionY) + Number(firstNode.dataset.height) / 2
    const lastCenter = Number(lastNode.dataset.positionY) + Number(lastNode.dataset.height) / 2
    expect(Number(screen.getByTestId('mindmap-summary-node-1').style.height.replace('px', ''))).toBeCloseTo(Math.max(44, Math.abs(lastCenter - firstCenter)))

    fireEvent.click(within(screen.getByTestId('mindmap-node-node-1-1')).getByRole('button', { name: '增加子节点' }))
    const newLeafId = useDocumentStore.getState().currentDoc?.root.children[0].children[0].children[0].id
    await waitFor(() => expect(within(screen.getByTestId(`mindmap-node-${newLeafId}`)).getByText('阶段概要')).toBeInTheDocument())
  })

  it('uses the minimum brace for one node, edits the summary inline, and expands it for a larger selection', () => {
    render(<MindMapView />)

    fireEvent.click(screen.getByTestId('flow-node-node-1'))
    fireEvent.click(screen.getByRole('button', { name: '概要' }))
    fireEvent.change(screen.getByRole('textbox', { name: '概要内容' }), { target: { value: '单节点概要' } })

    expect(screen.getByTestId('mindmap-summary-node-1')).toHaveStyle({ height: '44px' })
    fireEvent.doubleClick(screen.getByRole('button', { name: '概要节点 单节点概要' }))
    fireEvent.change(screen.getByRole('textbox', { name: '编辑概要节点' }), { target: { value: '已编辑概要' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '编辑概要节点' }), { key: 'Enter' })
    expect(useDocumentStore.getState().currentDoc?.root.children[0].summary?.text).toBe('已编辑概要')

    fireEvent.click(screen.getByTestId('flow-node-node-1'), { ctrlKey: true })
    fireEvent.click(screen.getByTestId('flow-node-node-2'), { ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '概要' }))
    expect(useDocumentStore.getState().currentDoc?.root.children[0].summary?.nodeIds).toEqual(['node-1', 'node-2'])
    expect(Number(screen.getByTestId('mindmap-summary-node-1').style.height.replace('px', ''))).toBeGreaterThan(0)
  })

  it('places a balanced left-branch summary on the left and spans terminal descendants', async () => {
    useDocumentStore.setState((state) => ({
      currentDoc: state.currentDoc ? {
        ...state.currentDoc,
        mindMapLayout: { engineVersion: 3, strategy: 'balanced-mindmap', nodes: {} },
        root: {
          ...state.currentDoc.root,
          children: state.currentDoc.root.children.map((node) => node.id === 'node-1' ? {
            ...node,
            summary: { text: '左侧概要', nodeIds: ['node-1'] },
            children: [...node.children, createNode('node-1-2', '第二个末级节点')],
          } : node),
        },
      } : null,
    }))
    render(<MindMapView />)

    await waitFor(() => expect(screen.getByTestId('mindmap-summary-node-1')).toHaveAttribute('data-summary-side', 'left'))
    const summary = screen.getByTestId('mindmap-summary-node-1')
    const firstLeaf = screen.getByTestId('flow-node-node-1-1')
    const lastLeaf = screen.getByTestId('flow-node-node-1-2')
    const expectedSpan = Math.abs(
      Number(lastLeaf.dataset.positionY) + Number(lastLeaf.dataset.height) / 2
      - Number(firstLeaf.dataset.positionY) - Number(firstLeaf.dataset.height) / 2,
    )
    expect(Number(summary.style.height.replace('px', ''))).toBeCloseTo(Math.max(44, expectedSpan))
    expect(summary).toHaveClass('right-full')
  })

  it('selects a summary as a rich node and applies toolbar functions to the summary itself', () => {
    render(<MindMapView />)
    fireEvent.click(screen.getByTestId('flow-node-node-1'))
    fireEvent.click(screen.getByRole('button', { name: '概要' }))
    fireEvent.change(screen.getByRole('textbox', { name: '概要内容' }), { target: { value: '完整功能概要' } })

    fireEvent.click(screen.getByRole('button', { name: '概要节点 完整功能概要' }))
    fireEvent.click(screen.getByRole('button', { name: '文字格式' }))
    fireEvent.click(screen.getByRole('button', { name: '加粗' }))
    fireEvent.click(screen.getByRole('button', { name: '待办' }))

    expect(useDocumentStore.getState().currentDoc?.root.children[0].summary).toMatchObject({
      text: '完整功能概要',
      checked: false,
      format: { bold: true },
    })
    fireEvent.click(screen.getByRole('button', { name: '编辑描述' }))
    fireEvent.change(screen.getByRole('textbox', { name: '概要描述' }), { target: { value: '概要描述内容' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '概要描述' }), { key: 'Enter' })
    expect(useDocumentStore.getState().currentDoc?.root.children[0].summary?.note).toBe('概要描述内容')
  })

  it('uses the 650px node cap and omits the minimap preview', () => {
    render(<MindMapView />)
    expect(screen.getByTestId('mindmap-node-node-2')).toHaveClass('max-w-[650px]')
    expect(screen.queryByTestId('flow-minimap')).not.toBeInTheDocument()
  })

  it('deletes all ctrl-selected nodes as one action', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MindMapView />)

    fireEvent.click(screen.getByTestId('flow-node-node-1'), { ctrlKey: true })
    fireEvent.click(screen.getByTestId('flow-node-node-2'), { ctrlKey: true })
    fireEvent.keyDown(window, { key: 'Delete' })

    expect(useDocumentStore.getState().currentDoc?.root.children).toHaveLength(0)
    expect(useDocumentStore.getState().outlineSelection.selectedNodeIds).toEqual([])
  })

  it('edits table cells inline and manages a multi-image grid', () => {
    useDocumentStore.setState((state) => ({
      currentDoc: state.currentDoc ? {
        ...state.currentDoc,
        root: {
          ...state.currentDoc.root,
          children: state.currentDoc.root.children.map((node) => node.id === 'node-2' ? {
            ...node,
            format: {
              table: [['姓名', '状态']],
              imageDataUrls: ['data:image/png;base64,AA', 'data:image/png;base64,BB'],
            },
          } : node),
        },
      } : null,
    }))
    render(<MindMapView />)

    fireEvent.change(screen.getByRole('textbox', { name: '表格第1行第1列' }), { target: { value: '负责人' } })
    fireEvent.click(screen.getByRole('button', { name: '行操作' }))
    fireEvent.click(screen.getByRole('button', { name: '在后面添加行' }))
    expect(useDocumentStore.getState().currentDoc?.root.children[1].format?.table).toEqual([['负责人', '状态'], ['', '']])

    fireEvent.click(screen.getByRole('button', { name: '列操作' }))
    fireEvent.click(screen.getByRole('button', { name: '在后面添加列' }))
    expect(useDocumentStore.getState().currentDoc?.root.children[1].format?.table).toEqual([['负责人', '', '状态'], ['', '', '']])
    expect(screen.getByRole('textbox', { name: '表格第1行第1列' })).toHaveClass('w-full')
    expect(screen.getByRole('textbox', { name: '表格第1行第1列' }).parentElement?.parentElement?.parentElement).not.toHaveClass('px-3')
    fireEvent.click(screen.getByRole('button', { name: '列操作' }))
    expect(screen.getByRole('button', { name: '列操作' })).toHaveClass('h-4', 'w-6', 'bg-zinc-600/90')
    expect(screen.getByRole('button', { name: '在前面添加列' }).parentElement?.parentElement).toHaveClass('left-full', 'top-1/2')
    fireEvent.mouseLeave(screen.getByRole('button', { name: '列操作' }).parentElement!)
    expect(screen.getByRole('button', { name: '在前面添加列' })).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('button', { name: '在前面添加列' })).not.toBeInTheDocument()

    const firstImageButton = screen.getByRole('button', { name: '节点图片 1' })
    expect(firstImageButton).toHaveClass('aspect-square')
    expect(firstImageButton.parentElement?.parentElement?.parentElement).toHaveClass('max-w-[240px]')
    fireEvent.click(firstImageButton)
    expect(screen.getByAltText('图片大图预览')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭大图' }))
    expect(screen.getByRole('button', { name: '节点图片 1' })).not.toHaveClass('ring-2')
    fireEvent.contextMenu(screen.getByRole('button', { name: '节点图片 1' }))
    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    expect(useDocumentStore.getState().currentDoc?.root.children[1].format?.imageDataUrls).toHaveLength(1)
    expect(screen.getByRole('button', { name: '节点图片 1' })).not.toHaveClass('aspect-square')
    expect(screen.getByRole('button', { name: '节点图片 1' })).toHaveClass('w-full', 'max-w-full')
    expect(screen.getByRole('button', { name: '节点图片 1' }).querySelector('img')).toHaveClass('object-contain')
    expect(screen.queryByRole('button', { name: '继续添加图片' })).not.toBeInTheDocument()
  })

  it('applies marker color only to the selected text range', () => {
    render(<MindMapView />)
    fireEvent.click(screen.getByTestId('flow-node-node-2'))
    fireEvent.doubleClick(screen.getByTestId('flow-node-node-2'))
    const editor = screen.getByRole('textbox', { name: '编辑节点文本' }) as HTMLTextAreaElement
    editor.focus()
    editor.setSelectionRange(0, 2)

    fireEvent.click(screen.getByRole('button', { name: '标记颜色' }))
    fireEvent.click(screen.getByRole('button', { name: '#fff2a8' }))

    expect(useDocumentStore.getState().currentDoc?.root.children[1].format?.textSpans).toEqual([
      { start: 0, end: 2, backgroundColor: '#fff2a8' },
    ])
    expect(useDocumentStore.getState().currentDoc?.root.children[1].format?.backgroundColor).toBeUndefined()
  })

  it('starts editing from the second click even while canvas interaction is locked', async () => {
    render(<MindMapView />)

    fireEvent.click(screen.getByTestId('mindmap-node-node-2'), { detail: 2 })

    await waitFor(() => {
      expect(screen.getByTestId('mindmap-node-node-2').querySelector('textarea')).toBeInTheDocument()
    })
  })

  it('uses one node border while editing and hides the right anchor visually', () => {
    render(<MindMapView />)

    fireEvent.click(screen.getByTestId('flow-node-node-2'))
    expect(screen.getByTestId('mindmap-node-node-2')).toHaveClass('border-[var(--color-primary)]')
    expect(within(screen.getByTestId('mindmap-node-node-2')).getByTestId('flow-handle-left-source')).toHaveStyle({ background: '#18181B' })
    expect(within(screen.getByTestId('mindmap-node-node-2')).getByTestId('flow-handle-right-source')).toHaveStyle({ opacity: '0' })

    fireEvent.doubleClick(screen.getByTestId('flow-node-node-2'))
    expect(screen.getByRole('textbox', { name: '编辑节点文本' })).toHaveClass('border-0')
    expect(screen.getByTestId('mindmap-node-node-2')).toHaveClass('border-[var(--color-primary)]')
  })

  it('shows hover controls for collapse and adding a child', () => {
    render(<MindMapView />)

    expect(within(screen.getByTestId('mindmap-node-node-1')).getByRole('button', { name: '收起子节点' })).toBeInTheDocument()
    expect(within(screen.getByTestId('mindmap-node-node-2')).getByRole('button', { name: '增加子节点' })).toBeInTheDocument()
  })

  it('shows the child count badge after collapse and expands from the badge', async () => {
    render(<MindMapView />)
    const parentNode = screen.getByTestId('mindmap-node-node-1')

    fireEvent.click(within(parentNode).getByRole('button', { name: '收起子节点' }))
    const badge = await screen.findByRole('button', { name: '展开节点，1 个子节点' })
    expect(badge).toHaveTextContent('1')
    expect(screen.queryByText('1 个子节点')).not.toBeInTheDocument()

    fireEvent.click(badge)
    await waitFor(() => expect(screen.getByTestId('mindmap-node-node-1-1')).toBeInTheDocument())
  })

  it('adds a child from the leaf-node hover control', () => {
    render(<MindMapView />)

    fireEvent.click(within(screen.getByTestId('mindmap-node-node-2')).getByRole('button', { name: '增加子节点' }))

    expect(useDocumentStore.getState().currentDoc?.root.children[1].children).toHaveLength(1)
  })

  it('renders inline content in non-editing mind map nodes', () => {
    useDocumentStore.setState((state) => ({
      currentDoc: state.currentDoc
        ? {
          ...state.currentDoc,
          root: {
            ...state.currentDoc.root,
            children: [
              {
                ...state.currentDoc.root.children[0],
                text: '**粗体** *斜体* `code` $x^2$',
              },
            ],
          },
        }
        : state.currentDoc,
    }))

    render(<MindMapView />)

    const node = screen.getByTestId('mindmap-node-node-1')
    expect(within(node).getByText('粗体').tagName).toBe('STRONG')
    expect(within(node).getByText('斜体').tagName).toBe('EM')
    expect(within(node).getByText('code').tagName).toBe('CODE')
    expect(within(node).getByText('x^2')).toHaveAttribute('data-inline-latex')
    expect(node).not.toHaveTextContent('**粗体**')
  })

  it('confirms before deleting a node with children', () => {
    render(<MindMapView />)

    fireEvent.contextMenu(screen.getByTestId('flow-node-node-1'))
    fireEvent.click(screen.getByRole('menuitem', { name: '删除节点' }))

    const dialog = screen.getByRole('dialog', { name: '删除节点' })
    expect(within(dialog).getByText('确定删除「第一节点」及其 1 个子节点吗？')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: '删除' }))

    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual(['node-2'])
  })

  it('does not run structural shortcuts while composing text input', () => {
    render(<MindMapView />)

    fireEvent.doubleClick(screen.getByTestId('flow-node-node-2'))
    const input = screen.getByDisplayValue('第二节点')
    fireEvent.compositionStart(input)
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual([
      'node-1',
      'node-2',
    ])
  })

  it('keeps IME draft text local while composing in inline editing', () => {
    render(<MindMapView />)

    fireEvent.doubleClick(screen.getByTestId('flow-node-node-2'))
    const input = screen.getByDisplayValue('第二节点')

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'nihao' } })

    expect(input).toHaveValue('nihao')
    expect(useDocumentStore.getState().currentDoc?.root.children[1].text).toBe('第二节点')
    expect(useDocumentStore.getState().activeTextEditSession?.didChange).toBe(false)

    fireEvent.compositionEnd(input, { data: '你好' })
    fireEvent.change(input, { target: { value: '你好' } })
    fireEvent.blur(input)

    expect(useDocumentStore.getState().currentDoc?.root.children[1].text).toBe('你好')
    expect(useDocumentStore.getState().canUndo).toBe(true)
  })

  it('commits IME text from composition end when no extra change event follows', () => {
    render(<MindMapView />)

    fireEvent.doubleClick(screen.getByTestId('flow-node-node-2'))
    const input = screen.getByDisplayValue('第二节点')

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'nihao' } })
    fireEvent.compositionEnd(input, { data: '你好', target: { value: '你好' } })
    fireEvent.blur(input)

    expect(useDocumentStore.getState().currentDoc?.root.children[1].text).toBe('你好')
    expect(screen.queryByDisplayValue('空白节点')).not.toBeInTheDocument()
  })

  it('locks the layout canvas by default and hides the interaction toggle', () => {
    render(<MindMapView />)

    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-draggable', 'false')
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-connectable', 'false')
    expect(screen.queryByTestId('flow-controls')).not.toBeInTheDocument()
    return undefined

    fireEvent.click(screen.getByTestId('flow-controls'))
    fireEvent.dragEnd(screen.getByTestId('flow-node-node-2'))

    expect(useDocumentStore.getState().currentDoc?.mindMapLayout?.nodes['node-2']).toMatchObject({
      position: { x: 333, y: 222 },
      source: 'manual',
      locked: true,
    })
    expect(useDocumentStore.getState().currentDoc?.mindMapLayout?.nodes['node-1-1']).toMatchObject({
      locked: false,
    })
    expect(useDocumentStore.getState().isDirty).toBe(true)
    expect(screen.getByText('布局已更新')).toBeInTheDocument()
  })

  it('switches to reorganize mode and keeps the ReactFlow drag channel enabled', async () => {
    render(<MindMapView />)
    expandMindMapToolbar()

    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-draggable', 'false')
    fireEvent.click(screen.getByRole('button', { name: '重组' }))
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-connectable', 'false')
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-draggable', 'true')
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-connectable', 'false')
    await waitFor(() => expect(screen.getByTestId('mindmap-node-node-2')).not.toHaveAttribute('draggable'))
  })

  it('keeps anchor connections disabled in reorganize mode', () => {
    render(<MindMapView />)
    expandMindMapToolbar()

    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-connectable', 'false')
    expect(within(screen.getByTestId('mindmap-node-node-1')).getByTestId('flow-handle-right-source')).toHaveStyle({
      opacity: '0',
      pointerEvents: 'none',
    })
    return undefined

    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-connectable', 'false')
    fireEvent.click(screen.getByRole('button', { name: '重组' }))
    fireEvent.click(screen.getByTestId('flow-controls'))
    fireEvent.click(screen.getByTestId('flow-connect-node-1-to-node-2'))

    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual(['node-1'])
    expect(useDocumentStore.getState().currentDoc?.root.children[0].children.map((node) => node.id)).toEqual([
      'node-1-1',
      'node-2',
    ])
  })

  it('uses ReactFlow dragging in reorganize mode to move nodes', async () => {
    render(<MindMapView />)
    expandMindMapToolbar()

    fireEvent.click(screen.getByRole('button', { name: '重组' }))
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-draggable', 'true')
    fireEvent.dragStart(screen.getByTestId('flow-node-node-2'))
    fireEvent.dragEnd(screen.getByTestId('flow-node-node-2'))

    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual(['node-1'])
    expect(useDocumentStore.getState().currentDoc?.root.children[0].children.map((node) => node.id)).toEqual([
      'node-1-1',
      'node-2',
    ])
    expect(useDocumentStore.getState().currentDoc?.mindMapLayout).toBeUndefined()
  })

  it('keeps the dragged node position while updating the reorganize drop preview', async () => {
    useDocumentStore.setState((state) => ({
      currentDoc: state.currentDoc
        ? {
          ...state.currentDoc,
          mindMapLayout: {
            engineVersion: 1,
            strategy: 'classic-dagre',
            nodes: {
              root: { position: { x: 0, y: 0 }, source: 'manual', locked: true },
              'node-1': { position: { x: 300, y: 100 }, source: 'manual', locked: true },
              'node-1-1': { position: { x: 600, y: 100 }, source: 'manual', locked: true },
              'node-2': { position: { x: 900, y: 300 }, source: 'manual', locked: true },
            },
          },
        }
        : state.currentDoc,
    }))
    render(<MindMapView />)
    expandMindMapToolbar()

    fireEvent.click(screen.getByRole('button', { name: '重组' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '重组' })).toHaveClass('bg-[var(--color-tint-lavender)]'))
    const draggedNode = screen.getByTestId('flow-node-node-2')
    expect(draggedNode).toHaveAttribute('data-position-x', '900')

    fireEvent.dragStart(draggedNode)
    fireEvent.drag(draggedNode)

    await waitFor(() => expect(screen.getByTestId('mindmap-node-node-1')).toHaveClass('ring-2'))
    expect(screen.getByTestId('flow-node-node-2')).toHaveAttribute('data-position-x', '300')
    expect(screen.getByTestId('flow-node-node-2')).toHaveAttribute('data-position-y', '100')
  })

  it.skip('reserves child-column space while previewing a reorganize child drop', async () => {
    useDocumentStore.setState((state) => ({
      currentDoc: state.currentDoc
        ? {
          ...state.currentDoc,
          mindMapLayout: {
            engineVersion: 1,
            strategy: 'classic-dagre',
            nodes: {
              root: { position: { x: 0, y: 0 }, source: 'manual', locked: true },
              'node-1': { position: { x: 100, y: 80 }, source: 'manual', locked: true },
              'node-1-1': { position: { x: 240, y: 96 }, source: 'manual', locked: true },
              'node-2': { position: { x: 500, y: 220 }, source: 'manual', locked: true },
            },
          },
        }
        : state.currentDoc,
    }))
    render(<MindMapView />)
    expandMindMapToolbar()

    fireEvent.click(screen.getByRole('button', { name: '重组' }))
    fireEvent.click(screen.getByTestId('flow-controls'))
    await waitFor(() => expect(screen.getByRole('button', { name: '重组' })).toHaveClass('bg-[var(--color-tint-lavender)]'))
    fireEvent.drag(screen.getByTestId('flow-node-node-2'))

    await waitFor(() => expect(screen.getByTestId('mindmap-node-node-1')).toHaveClass('ring-2'))
    expect(Number(screen.getByTestId('flow-node-node-1-1').dataset.positionX)).toBeGreaterThan(240)

    fireEvent.dragEnd(screen.getByTestId('flow-node-node-2'))

    expect(useDocumentStore.getState().currentDoc?.mindMapLayout?.nodes['node-1-1'].position).toEqual({ x: 240, y: 96 })
  })

  it('exposes classic, balanced, and free layouts while migrating removed radial strategy', () => {
    useDocumentStore.setState((state) => ({
      currentDoc: state.currentDoc
        ? {
          ...state.currentDoc,
          mindMapLayout: {
            engineVersion: 2,
            strategy: 'radial-mindmap',
            nodes: {},
          },
        }
        : state.currentDoc,
    }))

    render(<MindMapView />)
    expandMindMapToolbar()

    const availableStrategies = screen.getAllByRole('option').map((option) => ({
      label: option.textContent,
      value: (option as HTMLOptionElement).value,
    }))
    expect(availableStrategies.map(({ value }) => value)).toEqual([
      'classic-dagre',
      'balanced-mindmap',
      'free-canvas',
    ])
    expect(availableStrategies[2]?.label).toBe('自由模式')
    return undefined

    expect(availableStrategies).toEqual([
      { label: '经典模式', value: 'classic-dagre' },
      { label: '平衡模式', value: 'balanced-mindmap' },
    ])
    return undefined

    const strategySelect = screen.getByLabelText('导图布局策略')
    expect(strategySelect).toHaveValue('balanced-mindmap')
    expect(screen.getByRole('option', { name: '经典模式' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '思维导图模式' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '径向' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '自由画布' })).not.toBeInTheDocument()

    fireEvent.change(strategySelect, { target: { value: 'classic-dagre' } })

    expect(strategySelect).toHaveValue('classic-dagre')
  })

  it('keeps balanced branch handles hidden and non-interactive', async () => {
    useSettingsStore.setState((state) => ({
      settings: {
        ...state.settings,
        experimentalMindMapLayoutEngine: true,
      },
    }))
    useDocumentStore.setState((state) => ({
      currentDoc: state.currentDoc
        ? {
          ...state.currentDoc,
          root: {
            ...state.currentDoc.root,
            children: [
              { id: 'left-child', text: '左侧分支', createdAt: 1, updatedAt: 1, children: [] },
              { id: 'right-child', text: '右侧分支', createdAt: 1, updatedAt: 1, children: [] },
            ],
          },
        }
        : state.currentDoc,
    }))

    render(<MindMapView />)
    expandMindMapToolbar()
    fireEvent.change(screen.getByLabelText('导图布局策略'), { target: { value: 'balanced-mindmap' } })

    expect(screen.getByTestId('flow-node-left-child')).toBeInTheDocument()
    expect(screen.getByTestId('flow-node-right-child')).toBeInTheDocument()

    expect(within(screen.getByTestId('mindmap-node-root')).getByTestId('flow-handle-left-source')).toHaveStyle({
      opacity: '0',
      pointerEvents: 'none',
    })
    expect(within(screen.getByTestId('mindmap-node-root')).getByTestId('flow-handle-right-source')).toHaveStyle({
      opacity: '0',
      pointerEvents: 'none',
    })
    return undefined

    fireEvent.click(within(screen.getByTestId('mindmap-node-root')).getByTestId('flow-handle-left-source'))

    await waitFor(() => expect(screen.queryByTestId('flow-node-left-child')).not.toBeInTheDocument())
    expect(screen.getByTestId('flow-node-right-child')).toBeInTheDocument()

    fireEvent.click(within(screen.getByTestId('mindmap-node-root')).getByTestId('flow-handle-left-source'))

    await waitFor(() => expect(screen.getByTestId('flow-node-left-child')).toBeInTheDocument())
  })

  it('keeps layout node sizes on rendered nodes after insertion', () => {
    const doc = createDocument()
    const insertedDoc = {
      ...doc,
      root: {
        ...doc.root,
        children: [
          {
            ...doc.root.children[0],
            id: 'inserted-node',
            text: '插入后真实节点',
            children: [],
          },
        ],
      },
    }
    useDocumentStore.setState({ currentDoc: insertedDoc })

    render(<MindMapView />)

    expect(screen.getByTestId('flow-node-inserted-node')).toHaveAttribute('data-position-x')
    expect(screen.getByTestId('flow-node-inserted-node')).toHaveAttribute('data-width')
    expect(screen.getByTestId('flow-node-inserted-node')).toHaveAttribute('data-height')
  })

  it('focuses a branch from the mind map context menu and returns to the full map', async () => {
    render(<MindMapView />)
    expandMindMapToolbar()

    fireEvent.contextMenu(screen.getByTestId('flow-node-node-1'))
    fireEvent.click(screen.getByRole('menuitem', { name: '聚焦此分支' }))

    await waitFor(() => expect(screen.queryByTestId('flow-node-root')).not.toBeInTheDocument())
    expect(screen.getByText('已聚焦当前分支：第一节点')).toBeInTheDocument()
    expect(screen.getByTestId('flow-node-node-1')).toBeInTheDocument()
    expect(screen.queryByTestId('flow-node-node-2')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '回到全图' }))

    await waitFor(() => expect(screen.getByTestId('flow-node-root')).toBeInTheDocument())
    expect(screen.getByTestId('flow-node-node-2')).toBeInTheDocument()
  })

  it('exits branch focus when an external node focus request arrives', async () => {
    render(<MindMapView />)

    fireEvent.contextMenu(screen.getByTestId('flow-node-node-1'))
    fireEvent.click(screen.getByRole('menuitem', { name: '聚焦此分支' }))
    await waitFor(() => expect(screen.queryByTestId('flow-node-node-2')).not.toBeInTheDocument())

    act(() => {
      useDocumentStore.getState().focusNode('node-2')
    })

    await waitFor(() => expect(screen.getByTestId('flow-node-node-2')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: '回到全图' })).not.toBeInTheDocument()
  })

  it('returns to the parent branch after deleting the focused branch root', async () => {
    render(<MindMapView />)

    fireEvent.contextMenu(screen.getByTestId('flow-node-node-1-1'))
    fireEvent.click(screen.getByRole('menuitem', { name: '聚焦此分支' }))
    await waitFor(() => expect(screen.queryByTestId('flow-node-node-1')).not.toBeInTheDocument())

    fireEvent.contextMenu(screen.getByTestId('flow-node-node-1-1'))
    fireEvent.click(screen.getByRole('menuitem', { name: '删除节点' }))

    await waitFor(() => expect(screen.getByTestId('flow-node-node-1')).toBeInTheDocument())
    expect(screen.queryByTestId('flow-node-root')).not.toBeInTheDocument()
    expect(screen.queryByTestId('flow-node-node-2')).not.toBeInTheDocument()
  })

  it('keeps the removed mind map search unavailable and collapses tools by default', () => {
    render(<MindMapView />)

    expect(screen.getByRole('button', { name: '展开导图工具' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '搜索导图' })).not.toBeInTheDocument()
  })

  it('rebalances classic coordinates across both sides when balanced mode is selected', async () => {
    render(<MindMapView />)
    expandMindMapToolbar()

    fireEvent.change(screen.getByLabelText('导图布局策略'), { target: { value: 'balanced-mindmap' } })

    await waitFor(() => expect(useDocumentStore.getState().currentDoc?.mindMapLayout?.strategy).toBe('balanced-mindmap'))
    const rootX = Number(screen.getByTestId('flow-node-root').dataset.positionX)
    const firstX = Number(screen.getByTestId('flow-node-node-1').dataset.positionX)
    const secondX = Number(screen.getByTestId('flow-node-node-2').dataset.positionX)
    expect(Math.min(firstX, secondX)).toBeLessThan(rootX)
    expect(Math.max(firstX, secondX)).toBeGreaterThan(rootX)
  })

  it('uses transparent non-root surfaces and exposes a 100 percent reset control', () => {
    render(<MindMapView />)

    expect(screen.getByTestId('mindmap-node-node-1')).toHaveClass('bg-transparent')
    expect(screen.getByRole('button', { name: '恢复 100%' })).toHaveTextContent('100%')
    expect(screen.queryByRole('button', { name: 'fit view' })).not.toBeInTheDocument()
  })

  it('reapplies the current strategy when auto layout is requested', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    useDocumentStore.setState((state) => ({
      currentDoc: state.currentDoc
        ? {
          ...state.currentDoc,
          mindMapLayout: {
            engineVersion: 1,
            strategy: 'classic-dagre',
            nodes: {
              root: { position: { x: 0, y: 0 }, source: 'manual', locked: true },
              'node-1': { position: { x: 10, y: 20 }, source: 'manual', locked: true },
            },
          },
        }
        : state.currentDoc,
    }))
    render(<MindMapView />)
    expandMindMapToolbar()

    fireEvent.click(screen.getByRole('button', { name: '自动整理' }))

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(useDocumentStore.getState().currentDoc?.mindMapLayout).toMatchObject({
      engineVersion: 3,
      strategy: 'classic-dagre',
    })
    confirmSpy.mockRestore()
  })

  it('keeps mind map export out of the local canvas toolbar', () => {
    render(<MindMapView />)

    expect(screen.queryByRole('button', { name: '导出导图' })).not.toBeInTheDocument()
  })

  it('exposes free canvas while keeping force preview and diagnostics removed', () => {
    render(<MindMapView />)
    expandMindMapToolbar()

    expect(screen.getAllByRole('option').map((option) => (option as HTMLOptionElement).value)).toContain('free-canvas')
    expect(screen.queryByRole('button', { name: '力导向预览' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '布局诊断' })).not.toBeInTheDocument()
    return undefined

    expect(screen.queryByRole('option', { name: '自由画布' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '力导向预览' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '布局诊断' })).not.toBeInTheDocument()
  })

  it('persists manual positions without absorption in free mode', () => {
    render(<MindMapView />)
    expandMindMapToolbar()

    fireEvent.change(screen.getByLabelText('导图布局策略'), { target: { value: 'free-canvas' } })
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-draggable', 'true')
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-nodes-connectable', 'false')

    const draggedNode = screen.getByTestId('flow-node-node-2')
    fireEvent.dragStart(draggedNode)
    fireEvent.dragEnd(draggedNode)

    expect(useDocumentStore.getState().currentDoc?.mindMapLayout).toMatchObject({
      strategy: 'free-canvas',
      nodes: {
        'node-2': {
          position: { x: 333, y: 222 },
          source: 'manual',
          locked: true,
        },
      },
    })
    expect(useDocumentStore.getState().currentDoc?.root.children.map((node) => node.id)).toEqual(['node-1', 'node-2'])
  })

  it('restores the saved coordinates when returning to a document layout mode', async () => {
    useDocumentStore.setState((state) => state.currentDoc ? {
      currentDoc: {
        ...state.currentDoc,
        mindMapLayout: {
          engineVersion: 3,
          strategy: 'classic-dagre',
          nodes: { 'node-2': { position: { x: 122, y: 42 }, source: 'manual', locked: true } },
        },
        mindMapLayouts: {
          'classic-dagre': {
            engineVersion: 3,
            strategy: 'classic-dagre',
            nodes: { 'node-2': { position: { x: 122, y: 42 }, source: 'manual', locked: true } },
          },
          'free-canvas': {
            engineVersion: 3,
            strategy: 'free-canvas',
            nodes: { 'node-2': { position: { x: 333, y: 222 }, source: 'manual', locked: true } },
          },
        },
      },
    } : state)
    render(<MindMapView />)
    expandMindMapToolbar()
    const strategy = screen.getByLabelText('导图布局策略')

    fireEvent.change(strategy, { target: { value: 'free-canvas' } })
    await waitFor(() => expect(useDocumentStore.getState().currentDoc?.mindMapLayout?.nodes['node-2'].position).toEqual({ x: 333, y: 222 }))

    fireEvent.change(strategy, { target: { value: 'classic-dagre' } })
    await waitFor(() => expect(useDocumentStore.getState().currentDoc?.mindMapLayout?.nodes['node-2'].position).toEqual({ x: 122, y: 42 }))
  })

  it('updates document theme and custom canvas background from the palette', () => {
    useDocumentStore.setState((state) => state.currentDoc ? {
      currentDoc: {
        ...state.currentDoc,
        root: {
          ...state.currentDoc.root,
          children: state.currentDoc.root.children.map((node, index) => index === 0 ? {
            ...node,
            summary: { text: '概要', nodeIds: [node.id] },
          } : node),
        },
      },
    } : state)
    render(<MindMapView />)
    expandMindMapToolbar()

    fireEvent.click(screen.getByRole('button', { name: '配色与背景' }))
    fireEvent.click(screen.getByRole('button', { name: '配色 清风' }))
    fireEvent.change(screen.getByLabelText('自定义背景颜色'), { target: { value: '#dbeafe' } })

    expect(useDocumentStore.getState().currentDoc?.mindMapAppearance).toEqual({
      themeId: 'breeze',
      backgroundColor: '#DBEAFE',
    })
    expect(screen.getByTestId('mindmap-node-root')).toHaveStyle({ backgroundColor: '#36A852' })
    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-edge-stroke', '#24452B')
    expect(screen.getByTestId('mindmap-summary-node-1').querySelector('.mindmap-summary-brace')).toHaveStyle({ stroke: '#24452B' })
  })

  it('relayouts a branch and unlocks a node from experimental mind map menu', async () => {
    useSettingsStore.setState((state) => ({
      settings: {
        ...state.settings,
        experimentalMindMapLayoutEngine: true,
      },
    }))
    useDocumentStore.setState((state) => ({
      currentDoc: state.currentDoc
        ? {
          ...state.currentDoc,
          mindMapLayout: {
            engineVersion: 3,
            strategy: 'free-canvas',
            nodes: {
              root: { position: { x: 0, y: 0 }, source: 'manual', locked: true },
              'node-1': { position: { x: 100, y: 100 }, source: 'manual', locked: true },
              'node-1-1': { position: { x: 900, y: 900 }, source: 'manual', locked: false },
              'node-2': { position: { x: 300, y: 100 }, source: 'manual', locked: true },
            },
          },
        }
        : state.currentDoc,
    }))
    render(<MindMapView />)

    fireEvent.contextMenu(screen.getByTestId('flow-node-node-1'))
    fireEvent.click(screen.getByRole('menuitem', { name: '重排当前分支' }))

    expect(useDocumentStore.getState().currentDoc?.mindMapLayout?.nodes['node-1-1'].source).toBe('incremental')
    expect(useDocumentStore.getState().currentDoc?.mindMapLayout?.nodes['node-1-1'].position).not.toEqual({ x: 900, y: 900 })

    fireEvent.contextMenu(screen.getByTestId('flow-node-node-1'))
    fireEvent.click(screen.getByRole('menuitem', { name: '解锁当前节点' }))

    await waitFor(() => expect(useDocumentStore.getState().currentDoc?.mindMapLayout?.nodes['node-1'].locked).toBe(false))
  })

})
