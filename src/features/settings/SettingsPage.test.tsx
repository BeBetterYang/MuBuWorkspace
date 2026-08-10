import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useWorkspaceStore } from '../../app/workspaceStore'
import { useSettingsStore } from './settingsStore'
import { SettingsPage } from './SettingsPage'
import type { AppSettings } from '../../types/settings'

const baseSettings: AppSettings = {
  autoSaveEnabled: true,
  autoSaveIntervalMs: 1500,
  defaultViewMode: 'outline',
  sidebarCollapsed: false,
  theme: 'system',
  focusMode: false,
  experimentalMindMapLayoutEngine: false,
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSettingsStore.setState({
      settings: baseSettings,
      isLoaded: true,
      isSaving: false,
      error: null,
    })
    useWorkspaceStore.setState({ activeView: 'settings' })
  })

  it('updates auto-save and default view settings from controls', async () => {
    const updateSettings = vi.spyOn(useSettingsStore.getState(), 'updateSettings')
      .mockImplementation(async (patch) => {
        useSettingsStore.setState((state) => ({ settings: { ...state.settings, ...patch } }))
      })

    render(<SettingsPage />)

    fireEvent.click(screen.getByLabelText('已开启'))
    fireEvent.click(screen.getByRole('button', { name: '导图' }))

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({ autoSaveEnabled: false })
      expect(updateSettings).toHaveBeenCalledWith({ defaultViewMode: 'mindmap' })
    })

    updateSettings.mockRestore()
  })

  it('updates theme and focus mode from interface controls', async () => {
    const updateSettings = vi.spyOn(useSettingsStore.getState(), 'updateSettings')
      .mockImplementation(async (patch) => {
        useSettingsStore.setState((state) => ({ settings: { ...state.settings, ...patch } }))
      })

    render(<SettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: '深色' }))
    fireEvent.click(screen.getByRole('button', { name: '开启' }))

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith({ theme: 'dark' })
      expect(updateSettings).toHaveBeenCalledWith({ focusMode: true })
    })

    updateSettings.mockRestore()
  })

  it('keeps the layout engine enabled without exposing an experimental toggle', () => {
    render(<SettingsPage />)
    expect(screen.queryByLabelText('启用实验性导图布局引擎')).not.toBeInTheDocument()
    expect(screen.queryByText('实验')).not.toBeInTheDocument()
  })

  it('does not expose the removed data maintenance section', () => {
    render(<SettingsPage />)

    expect(screen.queryByText('数据')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /重建索引/ })).not.toBeInTheDocument()
  })

  it('returns to the editor when closing settings', () => {
    render(<SettingsPage />)

    fireEvent.click(screen.getByRole('button', { name: '关闭设置' }))

    expect(useWorkspaceStore.getState().activeView).toBe('editor')
  })
})
