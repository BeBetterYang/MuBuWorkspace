import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkspaceStore } from '../../app/workspaceStore'
import { useSettingsStore } from '../../features/settings/settingsStore'
import { Sidebar } from './Sidebar'
import { useServerWorkspaceStore } from '../../features/workspace/serverWorkspaceStore'
import type { AppSettings } from '../../types/settings'

const settings: AppSettings = {
  autoSaveEnabled: true, autoSaveIntervalMs: 1500, defaultViewMode: 'outline', sidebarCollapsed: false,
  theme: 'system', focusMode: false, experimentalMindMapLayoutEngine: false,
  agent: { enabled: false, provider: 'openai-compatible', model: 'gpt-4.1', baseUrl: 'https://api.openai.com/v1', thinkingLevel: 'medium', contextScope: 'currentDocument' },
}

vi.mock('../../services/siweiApi', () => ({
  getServerWorkspace: vi.fn(async () => ({ items: [] })),
  createServerFolder: vi.fn(), createServerDocument: vi.fn(), deleteServerItem: vi.fn(),
}))

describe('Sidebar', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ activeView: 'editor' })
    useSettingsStore.setState({ settings, isLoaded: true, isSaving: false, error: null })
    useServerWorkspaceStore.setState({ items: [], loading: false, error: null })
  })

  it('switches to settings workspace and highlights the settings button', () => {
    render(<Sidebar />)
    fireEvent.click(screen.getByRole('button', { name: '设置' }))
    expect(useWorkspaceStore.getState().activeView).toBe('settings')
    expect(screen.getByRole('button', { name: '设置' })).toHaveClass('bg-[var(--color-tint-lavender)]')
  })

  it('renders the web workspace and document creation menu', () => {
    render(<Sidebar />)
    expect(screen.getByRole('textbox', { name: '搜索文档' })).toHaveClass('sidebar-search-input')
    expect(screen.getByRole('button', { name: '新建' })).toHaveClass('ui-icon-button-primary')
    expect(screen.queryByRole('button', { name: '智能创建AI' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '新建' }))
    expect(screen.getByRole('button', { name: '新建文档' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建文件夹' })).toBeInTheDocument()
  })

  it('filters documents and creates a document directly in a folder', async () => {
    useServerWorkspaceStore.setState({
      items: [
        { id: 'folder-a', type: 'folder', name: '项目资料', parentId: null, createdAt: 1, updatedAt: 1 },
        { id: 'doc-a', type: 'document', name: '需求说明', parentId: 'folder-a', createdAt: 1, updatedAt: 2 },
        { id: 'doc-b', type: 'document', name: '会议记录', parentId: null, createdAt: 1, updatedAt: 1 },
      ],
      loading: false,
      error: null,
    })
    const createDocument = vi.spyOn(useServerWorkspaceStore.getState(), 'createDocument').mockResolvedValue({
      id: 'new-doc', type: 'document', name: '新文档', parentId: 'folder-a', createdAt: 3, updatedAt: 3,
    })
    const loadWorkspace = vi.spyOn(useServerWorkspaceStore.getState(), 'load').mockResolvedValue()

    render(<Sidebar />)
    fireEvent.change(screen.getByRole('textbox', { name: '搜索文档' }), { target: { value: '会议' } })
    expect(screen.getByText('会议记录')).toBeInTheDocument()
    expect(screen.queryByText('项目资料')).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: '搜索文档' }), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: '在 项目资料 中新建文档' }))
    const input = screen.getByPlaceholderText('文档名称')
    fireEvent.change(input, { target: { value: '新文档' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(createDocument).toHaveBeenCalledWith('新文档', 'folder-a'))
    createDocument.mockRestore()
    loadWorkspace.mockRestore()
  })

  it('collapses without reserving sidebar width and exposes the recent-edit preview', () => {
    useSettingsStore.setState({ settings: { ...settings, sidebarCollapsed: true }, isLoaded: true, isSaving: false, error: null })
    render(<Sidebar />)
    const expand = screen.getByTitle('展开侧边栏 Ctrl + \\')
    expect(expand.closest('aside')).toHaveClass('w-0')
    fireEvent.mouseEnter(expand.parentElement!)
    expect(screen.getByText('最近编辑')).toBeInTheDocument()
    expect(screen.queryByText('搜索最近编辑 Ctrl + J')).not.toBeInTheDocument()
  })
})
