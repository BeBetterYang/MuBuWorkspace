export type DefaultViewMode = 'outline' | 'mindmap' | 'split'
export type ThemeMode = 'light' | 'dark' | 'system'
export interface AppSettings {
  autoSaveEnabled: boolean
  autoSaveIntervalMs: number
  defaultViewMode: DefaultViewMode
  sidebarCollapsed: boolean
  theme: ThemeMode
  focusMode: boolean
  experimentalMindMapLayoutEngine: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoSaveEnabled: true,
  autoSaveIntervalMs: 1500,
  defaultViewMode: 'mindmap',
  sidebarCollapsed: false,
  theme: 'system',
  focusMode: false,
  experimentalMindMapLayoutEngine: true,
}
