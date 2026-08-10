import React from 'react'
import ReactFlow, {
  Edge,
  Node,
  NodeDragHandler,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowInstance,
} from 'reactflow'

import { MindMapNode, type MindMapNodeData } from './MindMapNode'

const nodeTypes = {
  custom: MindMapNode,
  root: MindMapNode,
}

interface MindMapCanvasProps {
  nodes: Node<MindMapNodeData>[]
  edges: Edge[]
  nodesDraggable: boolean
  nodesConnectable: boolean
  backgroundColor: string
  ready: boolean
  onNodeClick: (event: React.MouseEvent, node: Node) => void
  onNodeDoubleClick: (event: React.MouseEvent, node: Node) => void
  onNodeContextMenu: (event: React.MouseEvent, node: Node) => void
  onPaneClick: () => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onNodeDrag: NodeDragHandler
  onNodeDragStart: NodeDragHandler
  onNodeDragStop: NodeDragHandler
  onKeyDown: React.KeyboardEventHandler
  onInit: (instance: ReactFlowInstance) => void
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void
}

export const MindMapCanvas = React.forwardRef<HTMLDivElement, MindMapCanvasProps>(({
  nodes,
  edges,
  nodesDraggable,
  nodesConnectable,
  backgroundColor,
  ready,
  onNodeClick,
  onNodeDoubleClick,
  onNodeContextMenu,
  onPaneClick,
  onNodesChange,
  onEdgesChange,
  onNodeDrag,
  onNodeDragStart,
  onNodeDragStop,
  onKeyDown,
  onInit,
  onViewportChange,
}, ref) => {
  const flowInstanceRef = React.useRef<ReactFlowInstance | null>(null)
  const canvasRootRef = React.useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = React.useState(1)

  const assignCanvasRootRef = React.useCallback((node: HTMLDivElement | null) => {
    canvasRootRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])

  const updateZoom = React.useCallback((nextZoom: number) => {
    canvasRootRef.current?.style.setProperty('--mindmap-inverse-zoom', String(1 / Math.max(nextZoom, 0.1)))
    if (canvasRootRef.current) canvasRootRef.current.dataset.mindmapDetail = nextZoom < 0.45 ? 'low' : 'full'
    setZoom(nextZoom)
  }, [])

  const handleInit = React.useCallback((instance: ReactFlowInstance) => {
    flowInstanceRef.current = instance
    updateZoom(instance.getZoom?.() ?? 1)
    onInit(instance)
  }, [onInit, updateZoom])

  return (
    <div ref={assignCanvasRootRef} data-mindmap-detail="full" tabIndex={0} aria-busy={!ready} className={`relative h-full w-full outline-none transition-opacity duration-75 ${ready ? 'opacity-100' : 'pointer-events-none opacity-0'}`} style={{ backgroundColor, '--mindmap-inverse-zoom': 1 } as React.CSSProperties}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDrag={onNodeDrag}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onKeyDown={onKeyDown}
        onInit={handleInit}
        onMove={(_event, viewport) => updateZoom(viewport.zoom)}
        onMoveEnd={(_event, viewport) => onViewportChange(viewport)}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={nodesDraggable}
        nodesConnectable={nodesConnectable}
        elementsSelectable
        onlyRenderVisibleElements={nodes.length > 80}
        zoomOnDoubleClick={false}
        className="text-zinc-700"
        style={{ backgroundColor }}
      >
      </ReactFlow>
      <div className="mindmap-zoom-controls safe-floating-bottom ui-popover absolute left-[calc(0.75rem+var(--safe-left))] z-20 flex w-11 flex-col overflow-hidden">
        <button type="button" aria-label="放大" title="放大" className="flex h-8 items-center justify-center border-b border-zinc-100 text-xl text-zinc-700 hover:bg-zinc-50" onClick={() => void flowInstanceRef.current?.zoomIn?.({ duration: 120 })}>+</button>
        <button type="button" aria-label="恢复 100%" title="点击恢复 100%" className="flex h-8 items-center justify-center border-b border-zinc-100 px-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50" onClick={() => void flowInstanceRef.current?.zoomTo?.(1, { duration: 160 })}>{Math.round(zoom * 100)}%</button>
        <button type="button" aria-label="缩小" title="缩小" className="flex h-8 items-center justify-center text-xl text-zinc-700 hover:bg-zinc-50" onClick={() => void flowInstanceRef.current?.zoomOut?.({ duration: 120 })}>−</button>
      </div>
    </div>
  )
})

MindMapCanvas.displayName = 'MindMapCanvas'
