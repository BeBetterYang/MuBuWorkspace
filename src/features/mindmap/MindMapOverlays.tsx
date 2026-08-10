import React from 'react'

import type { NodeOperationState } from '../document/documentStore'
import type { MindMapAppearance, MindMapLayoutStrategy } from '../../types/document'
import { MindMapContextMenu, MindMapMenuAction } from './MindMapContextMenu'
import { MindMapDeleteDialog } from './MindMapDeleteDialog'
import { MindMapSearchBar } from './MindMapSearchBar'
import { MindMapMode, MindMapToolbar } from './MindMapToolbar'

interface MindMapContextMenuState {
  nodeId: string
  x: number
  y: number
}

interface MindMapOverlaysProps {
  exportClean: boolean
  mode: MindMapMode
  focused: boolean
  searchOpen: boolean
  layoutStrategy: MindMapLayoutStrategy
  appearance: MindMapAppearance
  feedback: string | null
  searchQuery: string
  matchedNodeCount: number
  activeMatchIndex: number
  contextMenu: MindMapContextMenuState | null
  showContextMenu: boolean
  isContextNodeCollapsed: boolean
  contextNodeOperationState: NodeOperationState | null
  deleteMessage: string | null
  onModeChange: (mode: MindMapMode) => void
  onStrategyChange: (strategy: MindMapLayoutStrategy) => void
  onAutoLayout: () => void
  onAppearanceChange: (appearance: MindMapAppearance) => void
  onResetFocus: () => void
  onSearchQueryChange: (query: string) => void
  onPreviousSearchResult: () => void
  onNextSearchResult: () => void
  onCloseSearch: () => void
  onContextMenuAction: (action: MindMapMenuAction) => void
  onFocusContextBranch: () => void
  onRelayoutContextBranch?: () => void
  onUnlockContextNode?: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}

export const MindMapOverlays: React.FC<MindMapOverlaysProps> = ({
  exportClean,
  mode,
  focused,
  searchOpen,
  layoutStrategy,
  appearance,
  feedback,
  searchQuery,
  matchedNodeCount,
  activeMatchIndex,
  contextMenu,
  showContextMenu,
  isContextNodeCollapsed,
  contextNodeOperationState,
  deleteMessage,
  onModeChange,
  onStrategyChange,
  onAutoLayout,
  onAppearanceChange,
  onResetFocus,
  onSearchQueryChange,
  onPreviousSearchResult,
  onNextSearchResult,
  onCloseSearch,
  onContextMenuAction,
  onFocusContextBranch,
  onRelayoutContextBranch,
  onUnlockContextNode,
  onCancelDelete,
  onConfirmDelete,
}) => {
  return (
    <>
      {!exportClean && (
        <MindMapToolbar
          mode={mode}
          focused={focused}
          strategy={layoutStrategy}
          appearance={appearance}
          onModeChange={onModeChange}
          onStrategyChange={onStrategyChange}
          onAutoLayout={onAutoLayout}
          onAppearanceChange={onAppearanceChange}
          onResetFocus={onResetFocus}
        />
      )}
      {feedback && !exportClean && (
        <div className="ui-popover absolute right-4 top-[4.75rem] z-10 max-w-[calc(100%-2rem)] px-3 py-2 text-xs font-medium text-[var(--color-slate)]">
          {feedback}
        </div>
      )}
      {searchOpen && !exportClean && (
        <MindMapSearchBar
          query={searchQuery}
          matchCount={matchedNodeCount}
          activeIndex={Math.max(activeMatchIndex, 0)}
          onQueryChange={onSearchQueryChange}
          onPrevious={onPreviousSearchResult}
          onNext={onNextSearchResult}
          onClose={onCloseSearch}
        />
      )}
      {contextMenu && showContextMenu && contextNodeOperationState && (
        <MindMapContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isCollapsed={isContextNodeCollapsed}
          operationState={contextNodeOperationState}
          onAction={onContextMenuAction}
          onFocusBranch={onFocusContextBranch}
          onRelayoutBranch={onRelayoutContextBranch}
          onUnlockNode={onUnlockContextNode}
        />
      )}
      {deleteMessage && (
        <MindMapDeleteDialog
          message={deleteMessage}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
        />
      )}
    </>
  )
}
