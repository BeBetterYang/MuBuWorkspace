export interface OutlineDocument {
  id: string
  title: string
  version: number
  createdAt: number
  updatedAt: number
  mindMapLayout?: MindMapLayoutState
  mindMapLayouts?: Record<string, MindMapLayoutState>
  mindMapViewports?: Record<string, MindMapViewport>
  mindMapAppearance?: MindMapAppearance
  root: OutlineNode
}

export interface MindMapAppearance {
  themeId?: string
  backgroundColor?: string
}

export interface MindMapViewport {
  x: number
  y: number
  zoom: number
}

export interface MindMapLayoutPosition {
  x: number
  y: number
}

export type MindMapLayoutStrategy =
  | 'classic-dagre'
  | 'balanced-mindmap'
  | 'radial-mindmap'
  | 'free-canvas'
  | 'force-directed'
  | (string & {})
export type MindMapLayoutNodeSource = 'auto' | 'manual' | 'incremental' | 'force-applied'

export interface MindMapLayoutState {
  engineVersion: number
  strategy: MindMapLayoutStrategy
  nodes: Record<string, MindMapLayoutNodeState>
}

export interface MindMapLayoutNodeState {
  position: MindMapLayoutPosition
  source: MindMapLayoutNodeSource
  locked: boolean
  updatedAt?: number
}

export interface OutlineNode {
  id: string
  text: string
  note?: string
  summary?: NodeSummary
  collapsed?: boolean
  checked?: boolean
  tags?: string[]
  format?: NodeTextFormat
  createdAt: number
  updatedAt: number
  children: OutlineNode[]
}

export interface NodeTextFormat {
  color?: string
  fontSize?: number
  backgroundColor?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  link?: string
  code?: boolean
  quote?: boolean
  imageDataUrl?: string
  imageDataUrls?: string[]
  table?: string[][]
  listStyle?: 'bullet' | 'number'
  textSpans?: Array<{
    start: number
    end: number
    color?: string
    backgroundColor?: string
  }>
}

export interface NodeSummary {
  text: string
  nodeIds: string[]
  note?: string
  checked?: boolean
  format?: NodeTextFormat
}

export type ImportFormat = 'json' | 'markdown' | 'opml'
export type ExportFormat = 'json' | 'markdown' | 'opml' | 'html' | 'text'

export interface ImportPreview {
  document: OutlineDocument
  summary: ImportSummary
  report: ImportReport
}

export interface ImportSummary {
  title: string
  nodeCount: number
  maxDepth: number
  taskCount: number
  tagCount: number
  noteCount: number
  warningCount: number
}

export interface ImportReport {
  items: ImportReportItem[]
}

export interface ImportReportItem {
  severity: 'info' | 'warning'
  nodePath: string[]
  field: string
  value: string
  action: string
}

export type ImportApplyMode = 'newDocument' | 'appendToRoot' | 'appendToSelection'

export interface ImportApplyOptions {
  mode: ImportApplyMode
}

export interface RecentDocItem {
  path: string
  title: string
  lastOpenedAt: number
}

export type SearchMatchSource = 'text' | 'note' | 'tag'

export interface SearchMatch {
  source: SearchMatchSource
  value: string
  matchIndices: Array<[number, number]>
}

export interface SearchResult {
  nodeId: string
  text: string
  path: string[]
  matchIndices: Array<[number, number]>
  matchSources: SearchMatchSource[]
  matches: SearchMatch[]
}
