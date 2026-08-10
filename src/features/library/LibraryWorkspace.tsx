import React from 'react'
import {
  AlertCircle,
  Database,
  FilePlus2,
  FolderOpen,
  RefreshCw,
  Search,
  Tag,
} from 'lucide-react'

import { toast } from '../../components/common/Toast'
import { openFileDialog } from '../../services/siweiApi'
import { useAsyncOperation } from '../../hooks/useAsyncOperation'
import { useLibraryStore, type LibraryView } from './libraryStore'
import { LibraryDocumentsView } from './views/LibraryDocumentsView'
import { LibrarySearchView } from './views/LibrarySearchView'
import { LibraryTagsView } from './views/LibraryTagsView'
import { isLibraryRefreshFinished } from './libraryWorkspaceHelpers'

export const LibraryWorkspace: React.FC = () => {
  const activeView = useLibraryStore((s) => s.activeView)
  const docs = useLibraryStore((s) => s.docs)
  const docsHasMore = useLibraryStore((s) => s.docsHasMore)
  const docsStatusFilter = useLibraryStore((s) => s.docsStatusFilter)
  const docsKeyword = useLibraryStore((s) => s.docsKeyword)
  const docsSortBy = useLibraryStore((s) => s.docsSortBy)
  const searchQuery = useLibraryStore((s) => s.searchQuery)
  const searchResults = useLibraryStore((s) => s.searchResults)
  const searchHasMore = useLibraryStore((s) => s.searchHasMore)
  const searchStatusFilter = useLibraryStore((s) => s.searchStatusFilter)
  const searchFieldFilter = useLibraryStore((s) => s.searchFieldFilter)
  const tags = useLibraryStore((s) => s.tags)
  const tagsHasMore = useLibraryStore((s) => s.tagsHasMore)
  const isLoading = useLibraryStore((s) => s.isLoading)
  const error = useLibraryStore((s) => s.error)
  const refreshStatus = useLibraryStore((s) => s.refreshStatus)
  const runAddDoc = useAsyncOperation({ errorPrefix: '加入失败' })
  const runRefresh = useAsyncOperation({ errorPrefix: '刷新失败' })
  const runCancelRefresh = useAsyncOperation({ errorPrefix: '取消失败' })
  const runRebuild = useAsyncOperation({ errorPrefix: '重建失败' })

  const setActiveView = useLibraryStore((s) => s.setActiveView)
  const loadDocs = useLibraryStore((s) => s.loadDocs)
  const loadMoreDocs = useLibraryStore((s) => s.loadMoreDocs)
  const setDocsStatusFilter = useLibraryStore((s) => s.setDocsStatusFilter)
  const setDocsKeyword = useLibraryStore((s) => s.setDocsKeyword)
  const setDocsSortBy = useLibraryStore((s) => s.setDocsSortBy)
  const addDoc = useLibraryStore((s) => s.addDoc)
  const removeDoc = useLibraryStore((s) => s.removeDoc)
  const refreshDoc = useLibraryStore((s) => s.refreshDoc)
  const startRefreshJob = useLibraryStore((s) => s.startRefreshJob)
  const pollRefreshJob = useLibraryStore((s) => s.pollRefreshJob)
  const cancelRefreshJob = useLibraryStore((s) => s.cancelRefreshJob)
  const removeMissingDocs = useLibraryStore((s) => s.removeMissingDocs)
  const rebuildIndex = useLibraryStore((s) => s.rebuildIndex)
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery)
  const searchLibrary = useLibraryStore((s) => s.search)
  const loadMoreSearchResults = useLibraryStore((s) => s.loadMoreSearchResults)
  const setSearchStatusFilter = useLibraryStore((s) => s.setSearchStatusFilter)
  const setSearchFieldFilter = useLibraryStore((s) => s.setSearchFieldFilter)
  const loadTags = useLibraryStore((s) => s.loadTags)
  const loadMoreTags = useLibraryStore((s) => s.loadMoreTags)
  const openIndexedNode = useLibraryStore((s) => s.openIndexedNode)

  React.useEffect(() => {
    if (!activeView) return
    void loadDocs()
  }, [activeView, loadDocs])

  React.useEffect(() => {
    if (activeView === 'tags') void loadTags()
  }, [activeView, loadTags])

  React.useEffect(() => {
    if (activeView !== 'search') return
    const timer = window.setTimeout(() => {
      void searchLibrary()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [activeView, searchLibrary, searchQuery])

  React.useEffect(() => {
    if (!refreshStatus || isLibraryRefreshFinished(refreshStatus.status)) return

    const timer = window.setInterval(() => {
      void pollRefreshJob(refreshStatus.jobId)
    }, 500)
    return () => window.clearInterval(timer)
  }, [pollRefreshJob, refreshStatus])

  const currentView = activeView ?? 'docs'
  const handleAddDoc = async () => {
    await runAddDoc(async () => {
      const path = await openFileDialog(['siwei.json', 'json'])
      if (!path) return
      await addDoc(path)
      toast.success('已加入文档库')
    })
  }

  const handleRefreshAll = async () => {
    await runRefresh(async () => {
      await startRefreshJob()
      toast.success('刷新任务已启动')
    })
  }

  const handleCancelRefresh = async () => {
    await runCancelRefresh(async () => {
      await cancelRefreshJob()
      toast.info('已请求取消刷新')
    })
  }

  const handleRebuild = async () => {
    await runRebuild(async () => {
      await rebuildIndex()
      toast.success('索引库已重建')
    })
  }

  return (
    <section className="flex h-full flex-col bg-[var(--color-surface-soft)] text-[var(--color-charcoal)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-hairline)] bg-white px-6">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-zinc-700" />
          <span className="text-sm font-semibold">文档库</span>
          {isLoading && <RefreshCw size={13} className="animate-spin text-zinc-400" />}
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={handleAddDoc} className="ui-button ui-button-primary h-10 min-h-0 px-4 text-[13px]">
            <FilePlus2 size={14} />
            加入文档
          </button>
          <button type="button" onClick={handleRefreshAll} className="ui-button ui-button-secondary h-10 min-h-0 px-4 text-[13px]">
            <RefreshCw size={14} />
            刷新
          </button>
          <button type="button" onClick={handleRebuild} className="ui-button ui-button-secondary h-10 min-h-0 px-4 text-[13px]">
            重建索引
          </button>
        </div>
      </header>

      <div className="border-b border-[var(--color-hairline)] bg-white px-6 py-3">
        <div className="grid w-[390px] grid-cols-3 gap-1 border-b border-[var(--color-hairline)]">
          {[
            { key: 'docs', label: '文档', icon: FolderOpen },
            { key: 'search', label: '搜索', icon: Search },
            { key: 'tags', label: '标签', icon: Tag },
          ].map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveView(item.key as LibraryView)}
                className={`flex items-center justify-center gap-1.5 border-b-2 px-2 py-2 text-[13px] font-medium ${
                  currentView === item.key
                    ? 'border-[var(--color-primary)] text-[var(--color-ink)]'
                    : 'border-transparent text-[var(--color-steel)] hover:text-[var(--color-ink)]'
                }`}
              >
                <Icon size={13} />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertCircle size={14} />
          <span className="truncate">{error}</span>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-5">
        {currentView === 'docs' && (
          <LibraryDocumentsView
            docs={docs}
            hasMore={docsHasMore}
            statusFilter={docsStatusFilter}
            keyword={docsKeyword}
            sortBy={docsSortBy}
            onStatusFilterChange={setDocsStatusFilter}
            onKeywordChange={setDocsKeyword}
            onSortByChange={setDocsSortBy}
            onReload={() => void loadDocs()}
            onLoadMore={() => void loadMoreDocs()}
            onOpen={(doc) => void openIndexedNode(doc.path)}
            onRefresh={(doc) => void refreshDoc(doc.path)}
            onOpenLocation={() => {
              toast.info('当前版本暂不支持打开文件位置，可先打开文档或复制路径定位。')
            }}
            onRemove={(doc) => {
              void removeDoc(doc.path).then(() => toast.info('已移出文档库'))
            }}
            onRemoveMissing={() => {
              void removeMissingDocs().then(() => toast.info('已移除缺失文档记录'))
            }}
          />
        )}

        {currentView === 'search' && (
          <LibrarySearchView
            query={searchQuery}
            results={searchResults}
            hasMore={searchHasMore}
            statusFilter={searchStatusFilter}
            fieldFilter={searchFieldFilter}
            onQueryChange={setSearchQuery}
            onStatusFilterChange={setSearchStatusFilter}
            onFieldFilterChange={setSearchFieldFilter}
            onReload={() => void searchLibrary()}
            onLoadMore={() => void loadMoreSearchResults()}
            onOpen={(result) => void openIndexedNode(result.location?.documentPath ?? result.documentPath, result.location?.nodeId ?? result.nodeId)}
          />
        )}

        {currentView === 'tags' && (
          <LibraryTagsView
            tags={tags}
            hasMore={tagsHasMore}
            onSelectTag={(tag) => {
              setSearchQuery(tag)
              setActiveView('search')
            }}
            onLoadMore={() => void loadMoreTags()}
          />
        )}

      </main>

      {refreshStatus && (
        <footer className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-2 text-xs text-zinc-500">
          <span className="min-w-0 truncate">
            {refreshStatus.cancelled ? '已取消刷新，已完成的结果已保留' : '正在刷新文档库'}
            ：{refreshStatus.processed}/{refreshStatus.total}，成功 {refreshStatus.succeeded}，失败 {refreshStatus.failed}，跳过 {refreshStatus.skipped}
            {refreshStatus.currentPath ? `，当前 ${refreshStatus.currentPath}` : ''}
          </span>
          {!isLibraryRefreshFinished(refreshStatus.status) && (
            <button type="button" onClick={handleCancelRefresh} className="h-7 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-600 hover:bg-zinc-50">
              取消刷新
            </button>
          )}
        </footer>
      )}
    </section>
  )
}
