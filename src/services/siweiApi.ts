import type {
  ExportFormat,
  ImportFormat,
  ImportPreview,
  OutlineDocument,
  RecentDocItem,
  SearchResult,
} from '../types/document'
import type { AppSettings } from '../types/settings'
import type { AgentDocumentContext, AgentStatus } from '../features/agent/agentTypes'
import type {
  LibraryDocumentItem,
  LibraryDocumentQuery,
  LibraryPage,
  LibraryRefreshStatus,
  LibrarySearchQuery,
  LibrarySearchResult,
  LibraryTagQuery,
  LibraryTagSummary,
  LibraryTaskQuery,
  LibraryTaskSummary,
} from '../types/library'
import { browserInvokeFallback } from './browserInvokeFallback'

function callCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return browserInvokeFallback<T>(command, args)
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(payload.error || `请求失败 (${response.status})`)
  }
  return response.json() as Promise<T>
}

export interface ServerWorkspaceItem {
  id: string
  type: 'folder' | 'document'
  name: string
  parentId: string | null
  createdAt: number
  updatedAt: number
}

export function newDocument(): Promise<OutlineDocument> {
  return apiRequest<{ document: OutlineDocument }>('/api/documents', {
    method: 'POST',
    body: JSON.stringify({ name: '未命名文档', parentId: null }),
  }).then((result) => result.document)
}

export function saveDocument(path: string, doc: OutlineDocument): Promise<void> {
  return apiRequest<OutlineDocument>(`/api/documents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify({ document: doc }),
  }).then(() => undefined)
}

export function loadDocument(path: string): Promise<OutlineDocument> {
  return apiRequest(`/api/documents/${encodeURIComponent(path)}`)
}

export function exportMarkdown(path: string, doc: OutlineDocument): Promise<void> {
  return callCommand('export_markdown', { path, doc })
}

export function importMarkdown(path: string): Promise<OutlineDocument> {
  return callCommand('import_markdown', { path })
}

export function previewImportDocument(
  path: string,
  format: ImportFormat,
): Promise<ImportPreview> {
  return callCommand('preview_import_document', { path, format })
}

export function previewImportFile(file: File, format: ImportFormat): Promise<ImportPreview> {
  return file.text().then((content) => apiRequest('/api/import/preview', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, format, content }),
  }))
}

export async function downloadDocumentExport(doc: OutlineDocument, format: ExportFormat): Promise<void> {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ document: doc, format }),
  })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || '导出失败')
  downloadBlob(await response.blob(), `${doc.title || '未命名文档'}.${extensionForExportFormat(format)}`)
}

export function getServerWorkspace(): Promise<{ items: ServerWorkspaceItem[] }> {
  return apiRequest('/api/workspace')
}

export function createServerFolder(name: string, parentId: string | null): Promise<ServerWorkspaceItem> {
  return apiRequest('/api/folders', { method: 'POST', body: JSON.stringify({ name, parentId }) })
}

export function createServerDocument(name: string, parentId: string | null, document?: OutlineDocument): Promise<{ item: ServerWorkspaceItem; document: OutlineDocument }> {
  return apiRequest('/api/documents', { method: 'POST', body: JSON.stringify({ name, parentId, document }) })
}

export function deleteServerItem(id: string): Promise<void> {
  return apiRequest(`/api/items/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(() => undefined)
}

export function updateServerItem(id: string, patch: { name?: string; parentId?: string | null }): Promise<ServerWorkspaceItem> {
  return apiRequest(`/api/items/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export function duplicateServerItem(id: string): Promise<{ items: ServerWorkspaceItem[]; root: ServerWorkspaceItem }> {
  return apiRequest(`/api/items/${encodeURIComponent(id)}/duplicate`, { method: 'POST', body: '{}' })
}

export function exportJson(path: string, doc: OutlineDocument): Promise<void> {
  return callCommand('export_json', { path, doc })
}

export function importJson(path: string): Promise<OutlineDocument> {
  return callCommand('import_json', { path })
}

export function exportOpml(path: string, doc: OutlineDocument): Promise<void> {
  return callCommand('export_opml', { path, doc })
}

export function exportHtml(path: string, doc: OutlineDocument): Promise<void> {
  return callCommand('export_html', { path, doc })
}

export function exportPlainText(path: string, doc: OutlineDocument): Promise<void> {
  return callCommand('export_plain_text', { path, doc })
}

export function extensionForExportFormat(format: ExportFormat): string {
  switch (format) {
    case 'markdown':
      return 'md'
    case 'opml':
      return 'opml'
    case 'html':
      return 'html'
    case 'text':
      return 'txt'
    case 'json':
    default:
      return 'siwei.json'
  }
}

export function exportMindMapAsset(
  path: string,
  format: 'png' | 'pdf',
  bytes: number[],
): Promise<void> {
  downloadBytes(bytes, path, format === 'png' ? 'image/png' : 'application/pdf')
  return Promise.resolve()
}

export function getRecentDocs(): Promise<RecentDocItem[]> {
  return callCommand('get_recent_docs')
}

export function addRecentDoc(item: RecentDocItem): Promise<void> {
  return callCommand('add_recent_doc', { item })
}

export function removeRecentDoc(path: string): Promise<void> {
  return callCommand('remove_recent_doc', { path })
}

export function openFileDialog(filters: string[]): Promise<string | null> {
  return callCommand('open_file_dialog', { filters })
}

export function saveFileDialog(defaultName: string): Promise<string | null> {
  return Promise.resolve(defaultName)
}

export function searchDocument(
  doc: OutlineDocument,
  query: string,
): Promise<SearchResult[]> {
  return callCommand('search_document', { doc, query })
}

export function getSettings(): Promise<AppSettings> {
  return callCommand('get_settings')
}

export function updateSettings(settings: AppSettings): Promise<AppSettings> {
  return callCommand('update_settings', { settings })
}

export function agentStartSession(sessionKey: string): Promise<void> {
  return callCommand('agent_start_session', { sessionKey })
}

export function agentSendMessage(
  message: string,
  documentContext: AgentDocumentContext,
): Promise<void> {
  return callCommand('agent_send_message', { message, documentContext })
}

export function agentAbort(): Promise<void> {
  return callCommand('agent_abort')
}

export function agentGetStatus(): Promise<AgentStatus> {
  return callCommand('agent_get_status')
}

export function agentSaveApiKey(provider: string, apiKey: string): Promise<void> {
  return callCommand('agent_save_api_key', { provider, apiKey })
}

export function agentDeleteApiKey(provider: string): Promise<void> {
  return callCommand('agent_delete_api_key', { provider })
}

export function getLibraryDocs(): Promise<LibraryDocumentItem[]> {
  return callCommand('get_library_docs')
}

export function queryLibraryDocs(
  query: LibraryDocumentQuery = {},
): Promise<LibraryPage<LibraryDocumentItem>> {
  return callCommand('query_library_docs', { query })
}

export function addLibraryDoc(path: string): Promise<LibraryDocumentItem> {
  return callCommand('add_library_doc', { path })
}

export function removeLibraryDoc(path: string): Promise<void> {
  return callCommand('remove_library_doc', { path })
}

export function refreshLibraryDoc(path: string): Promise<LibraryDocumentItem> {
  return callCommand('refresh_library_doc', { path })
}

export function refreshLibrary(): Promise<LibraryDocumentItem[]> {
  return callCommand('refresh_library')
}

export function searchLibrary(query: string): Promise<LibrarySearchResult[]> {
  return callCommand('search_library', { query })
}

export function queryLibrarySearch(
  query: LibrarySearchQuery,
): Promise<LibraryPage<LibrarySearchResult>> {
  return callCommand('query_library_search', { query })
}

export function getLibraryTags(): Promise<LibraryTagSummary[]> {
  return callCommand('get_library_tags')
}

export function queryLibraryTags(
  query: LibraryTagQuery = {},
): Promise<LibraryPage<LibraryTagSummary>> {
  return callCommand('query_library_tags', { query })
}

export function getLibraryTasks(): Promise<LibraryTaskSummary[]> {
  return callCommand('get_library_tasks')
}

export function queryLibraryTasks(
  query: LibraryTaskQuery = {},
): Promise<LibraryPage<LibraryTaskSummary>> {
  return callCommand('query_library_tasks', { query })
}

export function rebuildLibraryIndex(): Promise<LibraryDocumentItem[]> {
  return callCommand('rebuild_library_index')
}

export function startLibraryRefresh(): Promise<string> {
  return callCommand('start_library_refresh')
}

export function getLibraryRefreshStatus(jobId: string): Promise<LibraryRefreshStatus> {
  return callCommand('get_library_refresh_status', { jobId })
}

export function cancelLibraryRefresh(jobId: string): Promise<LibraryRefreshStatus> {
  return callCommand('cancel_library_refresh', { jobId })
}

export function removeMissingLibraryDocs(): Promise<LibraryDocumentItem[]> {
  return callCommand('remove_missing_library_docs')
}

export function toggleLibraryTask(
  documentPath: string,
  nodeId: string,
  checked: boolean,
): Promise<LibraryTaskSummary> {
  return callCommand('toggle_library_task', { documentPath, nodeId, checked })
}

export function downloadBytes(bytes: number[], filename: string, mimeType: string): void {
  downloadBlob(new Blob([new Uint8Array(bytes)], { type: mimeType }), filename)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
