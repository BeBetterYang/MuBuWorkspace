import type {
  ExportFormat,
  ImportApplyOptions,
  ImportFormat,
  ImportPreview,
  MindMapLayoutPosition,
  MindMapLayoutState,
  MindMapAppearance,
  MindMapViewport,
  NodeTextFormat,
  NodeSummary,
  OutlineDocument,
} from '../../types/document'
import type { CheckedFilter, OutlineFilterState } from '../filter/filterUtils'

export type ViewMode = 'outline' | 'mindmap' | 'split'
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface NodeOperationState {
  canInsertSibling: boolean
  canInsertChild: boolean
  canDelete: boolean
  canIndent: boolean
  canOutdent: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  canToggleCollapse: boolean
}

export interface HistorySnapshot {
  currentDoc: OutlineDocument
  selectedNodeId: string | null
  collapsedNodeIds: string[]
  key: string
}

export interface TextEditSession {
  nodeId: string
  before: HistorySnapshot
  didChange: boolean
}

export interface OutlineSelectionState {
  anchorNodeId: string | null
  selectedNodeIds: string[]
}

export interface DocumentState {
  currentDoc: OutlineDocument | null
  viewMode: ViewMode
  selectedNodeId: string | null
  collapsedNodeIds: Set<string>
  isDirty: boolean
  saveStatus: SaveStatus
  currentFilePath: string | null
  filter: OutlineFilterState
  focusedNodeId: string | null
  focusRequestSeq: number
  canUndo: boolean
  canRedo: boolean
  undoStack: HistorySnapshot[]
  redoStack: HistorySnapshot[]
  cleanSnapshotKey: string | null
  activeTextEditSession: TextEditSession | null
  outlineSelection: OutlineSelectionState

  newDoc: () => Promise<void>
  loadDoc: (path: string) => Promise<void>
  saveDoc: (customPath?: string | null) => Promise<boolean>
  exportDoc: (path: string, format: ExportFormat) => Promise<void>
  importDoc: (path: string, format: ImportFormat) => Promise<void>
  applyImportPreview: (preview: ImportPreview, options: ImportApplyOptions) => void
  canDiscardCurrentDoc: () => boolean
  setViewMode: (mode: ViewMode) => void
  selectNode: (nodeId: string | null) => void
  setOutlineSelection: (selection: OutlineSelectionState) => void
  clearOutlineSelection: () => void

  updateNodeText: (nodeId: string, text: string) => void
  toggleCollapse: (nodeId: string) => void
  indentNode: (nodeId: string) => void
  outdentNode: (nodeId: string) => void
  moveNode: (nodeId: string, direction: 'up' | 'down') => void
  moveSelectedOutlineNodes: (nodeIds: string[], direction: 'up' | 'down') => boolean
  indentSelectedOutlineNodes: (nodeIds: string[]) => boolean
  outdentSelectedOutlineNodes: (nodeIds: string[]) => boolean
  moveNodeToSibling: (sourceNodeId: string, targetNodeId: string) => void
  moveNodeToParent: (sourceNodeId: string, targetParentNodeId: string, targetIndex: number) => void
  commitMindMapLayout: (layout: MindMapLayoutState | Record<string, MindMapLayoutPosition>) => void
  commitMindMapViewport: (strategy: string, viewport: MindMapViewport) => void
  updateMindMapAppearance: (appearance: MindMapAppearance) => void
  insertNode: (nodeId: string, text?: string) => string | null
  insertSiblingNode: (nodeId: string, text?: string) => string | null
  insertChildNode: (parentNodeId: string, text?: string) => string | null
  deleteNode: (nodeId: string) => void
  getNodeOperationState: (nodeId: string) => NodeOperationState
  toggleNodeCheck: (nodeId: string) => void
  updateNodeFormatting: (nodeId: string, format: Partial<NodeTextFormat>) => void
  updateNodeNote: (nodeId: string, note: string) => void
  updateNodeSummary: (nodeId: string, summary: NodeSummary | undefined) => void
  clearNodeNote: (nodeId: string) => void
  setNodeChecked: (nodeId: string, checked: boolean | undefined) => void
  toggleNodeChecked: (nodeId: string) => void
  addNodeTag: (nodeId: string, tag: string) => void
  removeNodeTag: (nodeId: string, tag: string) => void
  setNodeTags: (nodeId: string, tags: string[]) => void
  renameTag: (from: string, to: string) => void
  removeTagFromDocument: (tag: string) => void
  mergeTag: (from: string, to: string) => void
  setFilterQuery: (query: string) => void
  setFilterTag: (tag: string | null) => void
  setFilterChecked: (checked: CheckedFilter) => void
  clearFilters: () => void
  focusNode: (nodeId: string) => void
  undo: () => void
  redo: () => void
  beginTextEditSession: (nodeId: string) => void
  commitTextEditSession: (nodeId: string) => void
}
