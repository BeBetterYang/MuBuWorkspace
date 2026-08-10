import React from 'react'
import { Connection, ReactFlowInstance, useEdgesState, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'

import { useDocumentStore } from '../document/documentStore'
import { useNodeContextMenuController } from '../document/useNodeContextMenuController'
import { MindMapLayoutDiagnostics } from './layoutEngine'
import { MindMapNodeData } from './MindMapNode'
import { findNodeById, formatDeleteConfirmation } from './mindMapActions'
import { MindMapCanvas } from './MindMapCanvas'
import { MindMapEmptyState } from './MindMapEmptyState'
import { MindMapMode } from './MindMapToolbar'
import { MindMapOverlays } from './MindMapOverlays'
import { useMindMapFocus } from './useMindMapFocus'
import { useMindMapSearch } from './useMindMapSearch'
import { useMindMapLayoutActions } from './hooks/useMindMapLayoutActions'
import { useMindMapLayoutComputation } from './hooks/useMindMapLayoutComputation'
import { useMindMapKeyboardShortcuts } from './hooks/useMindMapKeyboardShortcuts'
import { useMindMapEditing } from './hooks/useMindMapEditing'
import { useMindMapGraphSelectors } from './hooks/useMindMapGraphSelectors'
import { useMindMapMeasuredNodeSizes } from './hooks/useMindMapMeasuredNodeSizes'
import { useMindMapStrategyState } from './hooks/useMindMapStrategyState'
import { useMindMapCanvasHandlers } from './hooks/useMindMapCanvasHandlers'
import { useMindMapOverlayHandlers } from './hooks/useMindMapOverlayHandlers'
import { useMindMapLayoutHandlers } from './hooks/useMindMapLayoutHandlers'
import { useMindMapActiveMatchFocus } from './hooks/useMindMapActiveMatchFocus'
import { useMindMapExportController } from './hooks/useMindMapExportController'
import { useMindMapFocusFeedback } from './hooks/useMindMapFocusFeedback'
import { useMindMapDragReorg } from './hooks/useMindMapDragReorg'
import { NodeFormattingToolbar } from '../document/NodeFormattingToolbar'
import { getMindMapLayoutForStrategy } from './mindMapLayoutState'

export const MindMapView: React.FC = () => {
  const currentDoc = useDocumentStore((s) => s.currentDoc)
  const collapsedNodeIds = useDocumentStore((s) => s.collapsedNodeIds)
  const selectedNodeId = useDocumentStore((s) => s.selectedNodeId)
  const selectedNodeIds = useDocumentStore((s) => s.outlineSelection.selectedNodeIds)
  const setOutlineSelection = useDocumentStore((s) => s.setOutlineSelection)
  const focusRequestSeq = useDocumentStore((s) => s.focusRequestSeq)
  const selectNode = useDocumentStore((s) => s.selectNode)
  const updateNodeText = useDocumentStore((s) => s.updateNodeText)
  const toggleCollapse = useDocumentStore((s) => s.toggleCollapse)
  const indentNode = useDocumentStore((s) => s.indentNode)
  const outdentNode = useDocumentStore((s) => s.outdentNode)
  const moveNode = useDocumentStore((s) => s.moveNode)
  const deleteNode = useDocumentStore((s) => s.deleteNode)
  const getNodeOperationState = useDocumentStore((s) => s.getNodeOperationState)
  const beginTextEditSession = useDocumentStore((s) => s.beginTextEditSession)
  const commitTextEditSession = useDocumentStore((s) => s.commitTextEditSession)
  const commitMindMapLayout = useDocumentStore((s) => s.commitMindMapLayout)
  const commitMindMapViewport = useDocumentStore((s) => s.commitMindMapViewport)
  const updateMindMapAppearance = useDocumentStore((s) => s.updateMindMapAppearance)
  const moveNodeToParent = useDocumentStore((s) => s.moveNodeToParent)
  const experimentalLayoutEnabled = true

  const [nodes, setNodes, onNodesChange] = useNodesState<MindMapNodeData>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [mode, setMode] = React.useState<MindMapMode>('layout')
  const [feedback, setFeedback] = React.useState<string | null>(null)
  const [selectedSummaryOwnerId, setSelectedSummaryOwnerId] = React.useState<string | null>(null)
  const [formattingToolbarOpen, setFormattingToolbarOpen] = React.useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = React.useState(false)
  const [layoutDiagnostics, setLayoutDiagnostics] = React.useState<MindMapLayoutDiagnostics | null>(null)
  const flowInstanceRef = React.useRef<ReactFlowInstance | null>(null)
  const centeredViewKeyRef = React.useRef<string | null>(null)
  const flowWrapperRef = React.useRef<HTMLDivElement | null>(null)
  const previousEditingNodeIdRef = React.useRef<string | null>(null)
  const readyLayoutKeyRef = React.useRef<string | null>(null)
  const [canvasReady, setCanvasReady] = React.useState(false)
  const [flowReady, setFlowReady] = React.useState(false)

  React.useEffect(() => {
    const selectSummary = (event: Event) => {
      const ownerId = (event as CustomEvent<{ ownerId?: string }>).detail?.ownerId
      if (!ownerId) return
      setSelectedSummaryOwnerId(ownerId)
      setFormattingToolbarOpen(true)
      selectNode(null)
    }
    window.addEventListener('siwei:select-summary', selectSummary)
    return () => window.removeEventListener('siwei:select-summary', selectSummary)
  }, [selectNode])

  React.useEffect(() => {
    setFormattingToolbarOpen(false)
    setSelectedSummaryOwnerId(null)
  }, [currentDoc?.id])

  const { measuredNodeSizes, measuredNodeSizeSignature } = useMindMapMeasuredNodeSizes(mode, nodes)
  const {
    editing,
    setEditing,
    startEditing,
    finishEditing,
    cancelEditing,
    clearEditing,
  } = useMindMapEditing({
    selectNode,
    beginTextEditSession,
    commitTextEditSession,
  })

  const {
    validFocusRootNodeId,
    handleFocusBranch,
    handleResetFocus,
    handleAfterDeleteFocus,
  } = useMindMapFocus({
    currentDoc,
    focusRequestSeq,
    selectedNodeId,
    selectNode,
  })

  useMindMapFocusFeedback({
    currentDoc,
    focusedNodeId: validFocusRootNodeId,
    setFeedback,
  })

  const {
    depthByNodeId,
    parentByNodeId,
    childIndexByNodeId,
    getNodeDescendantIds,
    visibleNodeIds,
    graphRootNode,
    structureKey,
  } = useMindMapGraphSelectors({
    currentDoc,
    collapsedNodeIds,
    validFocusRootNodeId,
  })

  const {
    searchOpen,
    searchQuery,
    activeMatchIndex,
    matchedNodeIds,
    activeMatchNodeId,
    setSearchOpen,
    handleSearchQueryChange,
    navigateSearch,
    closeSearch,
  } = useMindMapSearch({
    root: currentDoc?.root ?? null,
    visibleNodeIds,
  })

  const handleAfterDelete = React.useCallback((deletedNodeId: string) => {
    setEditing(null)
    handleAfterDeleteFocus(deletedNodeId)
  }, [handleAfterDeleteFocus])

  const {
    layoutStrategy,
    collapsedBranchSides,
    handleStrategyChange,
    toggleBranchSide,
  } = useMindMapStrategyState({
    currentDoc,
    experimentalLayoutEnabled,
    setFeedback,
  })

  const {
    contextMenu,
    contextNode,
    deleteTarget,
    closeContextMenu,
    openContextMenu,
    runAction,
    confirmDelete,
    cancelDelete,
    insertSiblingAndEdit,
    insertChildAndEdit,
    handleDelete,
  } = useNodeContextMenuController({
    currentDoc,
    onStartEditing: startEditing,
    onAfterDelete: handleAfterDelete,
  })

  const handleDirectNodeSelect = React.useCallback((nodeId: string, additive: boolean) => {
    setSelectedSummaryOwnerId(null)
    setFormattingToolbarOpen(true)
    if (!additive) {
      selectNode(nodeId)
      return
    }
    const next = selectedNodeIds.includes(nodeId)
      ? selectedNodeIds.filter((id) => id !== nodeId)
      : [...selectedNodeIds, nodeId]
    setOutlineSelection({ anchorNodeId: next[0] ?? null, selectedNodeIds: next })
  }, [selectNode, selectedNodeIds, setOutlineSelection])

  const layoutHandlers = useMindMapLayoutHandlers({
    startEditing,
    selectNode: handleDirectNodeSelect,
    toggleBranchSide,
    toggleCollapse,
    updateNodeText,
    finishEditing,
    cancelEditing,
    handleDelete,
    insertSiblingAndEdit,
    insertChildAndEdit,
    indentNode,
    outdentNode,
    moveNode,
  })

  const {
    forcePreview,
    handleAutoLayout,
    handleRelayoutBranch,
    handleUnlockNode,
    handleForceDirectedPreview,
    handleCancelForceDirectedPreview,
    handleApplyForceDirectedPreview,
  } = useMindMapLayoutActions({
    currentDoc,
    graphRootNode,
    collapsedNodeIds,
    visibleNodeIds,
    nodes,
    measuredNodeSizes,
    experimentalLayoutEnabled,
    layoutStrategy,
    commitMindMapLayout,
    setFeedback,
  })

  const { exportClean } = useMindMapExportController({
    documentTitle: currentDoc?.title ?? '未命名文档',
    nodes,
    flowWrapperRef,
  })

  useMindMapLayoutComputation({
    currentDoc,
    collapsedNodeIds,
    validFocusRootNodeId,
    exportClean,
    graphRootNode,
    structureKey,
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
    editingNodeId: editing?.nodeId ?? null,
    searchQuery,
    forcePreview,
    handlers: layoutHandlers,
    setNodes,
    setEdges,
    setLayoutDiagnostics,
    setFeedback,
  })

  useMindMapActiveMatchFocus({
    activeMatchNodeId,
    nodes,
    flowInstanceRef,
    selectNode,
  })

  const handleNodesChange = React.useCallback(onNodesChange, [onNodesChange])

  const { handleNodeDragStart, handleNodeDrag, handleNodeDragStop } = useMindMapDragReorg({
    nodes,
    setNodes,
    mode,
    currentDoc,
    forcePreviewActive: Boolean(forcePreview),
    parentByNodeId,
    childIndexByNodeId,
    getNodeDescendantIds,
    moveNodeToParent,
    commitMindMapLayout,
    layoutStrategy,
    setFeedback,
  })

  const layoutViewKey = currentDoc ? `${currentDoc.id}:${layoutStrategy}` : null
  React.useEffect(() => {
    if (!layoutViewKey) {
      readyLayoutKeyRef.current = null
      setCanvasReady(false)
      return
    }
    if (readyLayoutKeyRef.current === layoutViewKey) return
    setCanvasReady(false)
    let settleFrame = 0
    const measureFrame = window.requestAnimationFrame(() => {
      settleFrame = window.requestAnimationFrame(() => {
        readyLayoutKeyRef.current = layoutViewKey
        setCanvasReady(true)
      })
    })
    return () => {
      window.cancelAnimationFrame(measureFrame)
      if (settleFrame) window.cancelAnimationFrame(settleFrame)
    }
  }, [layoutViewKey])

  React.useEffect(() => {
    const previous = previousEditingNodeIdRef.current
    if (previous && !editing) {
      window.setTimeout(() => flowWrapperRef.current?.focus(), 0)
    }
    previousEditingNodeIdRef.current = editing?.nodeId ?? null
  }, [editing])

  const handleConnect = React.useCallback((connection: Connection) => {
    if (mode !== 'reorganize' || forcePreview || !currentDoc) return
    const parentNodeId = connection.source
    const childNodeId = connection.target
    if (!parentNodeId || !childNodeId || parentNodeId === childNodeId) return
    if (childNodeId === currentDoc.root.id) {
      setFeedback('根节点不能移动到其他节点下')
      return
    }
    if (getNodeDescendantIds(childNodeId).has(parentNodeId)) {
      setFeedback('不能创建循环的父子关系')
      return
    }

    const parentNode = findNodeById(currentDoc.root, parentNodeId)
    const childNode = findNodeById(currentDoc.root, childNodeId)
    if (!parentNode || !childNode) return

    moveNodeToParent(childNodeId, parentNodeId, parentNode.children.length)
    setFeedback(`已将「${childNode.text || '未命名节点'}」移动到「${parentNode.text || '未命名节点'}」下`)
  }, [currentDoc, forcePreview, getNodeDescendantIds, mode, moveNodeToParent])

  void handleConnect

  const deleteSelectedNodes = React.useCallback(() => {
    if (!currentDoc) return
    const candidates = selectedNodeIds.filter((nodeId) => nodeId !== currentDoc.root.id && !selectedNodeIds.some((otherId) => otherId !== nodeId && getNodeDescendantIds(otherId).has(nodeId)))
    if (candidates.length === 0) return
    if (!window.confirm(`确定删除选中的 ${candidates.length} 个节点及其子节点吗？`)) return
    candidates.forEach((nodeId) => deleteNode(nodeId))
    setOutlineSelection({ anchorNodeId: null, selectedNodeIds: [] })
    setEditing(null)
  }, [currentDoc, deleteNode, getNodeDescendantIds, selectedNodeIds, setEditing, setOutlineSelection])

  const handleKeyDown = useMindMapKeyboardShortcuts({
    selectedNodeId,
    selectedNodeIds,
    deleteSelectedNodes,
    runAction,
    closeContextMenu,
    clearEditing,
    selectNode,
  })

  const canvasHandlers = useMindMapCanvasHandlers({
    flowInstanceRef,
    selectNode,
    selectedNodeIds,
    setSelectedNodeIds: (nodeIds) => setOutlineSelection({
      anchorNodeId: nodeIds[0] ?? null,
      selectedNodeIds: nodeIds,
    }),
    startEditing,
    openContextMenu,
    closeContextMenu,
  })

  React.useEffect(() => {
    if (!currentDoc) return
    const focusNode = nodes.find((node) => node.id === currentDoc.root.children[0]?.id)
      ?? nodes.find((node) => node.id === currentDoc.root.id)
    if (!focusNode || !flowInstanceRef.current) return
    const viewKey = `${currentDoc.id}:${layoutStrategy}`
    if (centeredViewKeyRef.current === viewKey) return
    const savedViewport = currentDoc.mindMapViewports?.[layoutStrategy]
    if (savedViewport) {
      centeredViewKeyRef.current = viewKey
      void flowInstanceRef.current.setViewport?.(savedViewport, { duration: 0 })
      return
    }
    let frame = 0
    const timer = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => {
        centeredViewKeyRef.current = viewKey
        const width = focusNode.width ?? 120
        const height = focusNode.height ?? 36
        void flowInstanceRef.current?.setCenter?.(
          focusNode.position.x + width / 2,
          focusNode.position.y + height / 2,
          { zoom: 1, duration: 180 },
        )
      })
    }, 160)
    return () => {
      window.clearTimeout(timer)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [currentDoc, flowReady, layoutStrategy, nodes])

  const handleFlowInit = React.useCallback((instance: ReactFlowInstance) => {
    canvasHandlers.handleInit(instance)
    setFlowReady(true)
  }, [canvasHandlers.handleInit])

  const forcePreviewActive = Boolean(forcePreview)
  const handleLayoutStrategyChange = React.useCallback((strategy: Parameters<typeof handleStrategyChange>[0]) => {
    if (currentDoc) {
      const savedLayout = getMindMapLayoutForStrategy(currentDoc, strategy)
      commitMindMapLayout(savedLayout ?? { engineVersion: 3, strategy, nodes: {} })
    }
    handleStrategyChange(strategy)
  }, [commitMindMapLayout, currentDoc, handleStrategyChange])
  const overlayHandlers = useMindMapOverlayHandlers({
    contextMenu,
    experimentalLayoutEnabled,
    forcePreviewActive,
    runAction,
    handleFocusBranch,
    handleRelayoutBranch,
    handleUnlockNode,
    closeContextMenu,
    setDiagnosticsOpen,
    setSearchOpen,
    navigateSearch,
  })

  if (!currentDoc) {
    return <MindMapEmptyState />
  }

  const deleteMessage = deleteTarget ? formatDeleteConfirmation(deleteTarget) : null
  const mindMapAppearance = currentDoc.mindMapAppearance ?? { themeId: 'pure', backgroundColor: '#FFFFFF' }

  return (
    <div className="relative h-full w-full" style={{ backgroundColor: mindMapAppearance.backgroundColor ?? '#FFFFFF' }}>
      <MindMapCanvas
        ref={flowWrapperRef}
        nodes={nodes}
        edges={edges}
        nodesDraggable={mode === 'reorganize' && !forcePreview}
        nodesConnectable={false}
        backgroundColor={mindMapAppearance.backgroundColor ?? '#FFFFFF'}
        ready={canvasReady}
        onNodeClick={(event, node) => { setSelectedSummaryOwnerId(null); setFormattingToolbarOpen(true); canvasHandlers.handleNodeClick(event, node) }}
        onNodeDoubleClick={canvasHandlers.handleNodeDoubleClick}
        onNodeContextMenu={canvasHandlers.handleNodeContextMenu}
        onPaneClick={() => { setSelectedSummaryOwnerId(null); setFormattingToolbarOpen(false); canvasHandlers.handlePaneClick() }}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDrag={handleNodeDrag}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onKeyDown={handleKeyDown}
        onInit={handleFlowInit}
        onViewportChange={(viewport) => commitMindMapViewport(layoutStrategy, viewport)}
      />
      <MindMapOverlays
        exportClean={exportClean}
        mode={mode}
        focused={Boolean(validFocusRootNodeId)}
        searchOpen={searchOpen}
        layoutStrategy={layoutStrategy}
        appearance={mindMapAppearance}
        feedback={feedback}
        searchQuery={searchQuery}
        matchedNodeCount={matchedNodeIds.length}
        activeMatchIndex={activeMatchIndex}
        contextMenu={contextMenu}
        showContextMenu={Boolean(contextNode)}
        isContextNodeCollapsed={contextMenu ? collapsedNodeIds.has(contextMenu.nodeId) : false}
        contextNodeOperationState={contextMenu ? getNodeOperationState(contextMenu.nodeId) : null}
        deleteMessage={deleteMessage}
        onModeChange={setMode}
        onStrategyChange={handleLayoutStrategyChange}
        onAutoLayout={handleAutoLayout}
        onAppearanceChange={updateMindMapAppearance}
        onResetFocus={handleResetFocus}
        onSearchQueryChange={handleSearchQueryChange}
        onPreviousSearchResult={overlayHandlers.handlePreviousSearchResult}
        onNextSearchResult={overlayHandlers.handleNextSearchResult}
        onCloseSearch={closeSearch}
        onContextMenuAction={overlayHandlers.handleContextMenuAction}
        onFocusContextBranch={overlayHandlers.handleFocusContextBranch}
        onRelayoutContextBranch={overlayHandlers.handleRelayoutContextBranch}
        onUnlockContextNode={overlayHandlers.handleUnlockContextNode}
        onCancelDelete={cancelDelete}
        onConfirmDelete={confirmDelete}
      />
      {!exportClean && formattingToolbarOpen && selectedNodeId && (
        <NodeFormattingToolbar
          nodeId={selectedNodeId}
          nodeIds={selectedNodeIds}
          onFocusBranch={handleFocusBranch}
          onDeleteSelected={deleteSelectedNodes}
        />
      )}
      {!exportClean && formattingToolbarOpen && selectedSummaryOwnerId && (
        <NodeFormattingToolbar nodeId={selectedSummaryOwnerId} summaryOwnerId={selectedSummaryOwnerId} />
      )}
    </div>
  )
}
