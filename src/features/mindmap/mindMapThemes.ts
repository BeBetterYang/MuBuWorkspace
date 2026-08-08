export interface MindMapTheme {
  id: string
  name: string
  group: '简约' | '浅色' | '深色'
  rootBackground: string
  rootText: string
  branchBackground: string
  nodeBackground: string
  text: string
  line: string
  accent: string
}

export const MIND_MAP_THEMES: MindMapTheme[] = [
  { id: 'pure', name: '纯真', group: '简约', rootBackground: '#4F46E5', rootText: '#FFFFFF', branchBackground: '#F5F3FF', nodeBackground: '#FFFFFF', text: '#27272A', line: '#3F3F46', accent: '#6366F1' },
  { id: 'clear-line', name: '明线', group: '简约', rootBackground: '#FFFFFF', rootText: '#18181B', branchBackground: '#FFFFFF', nodeBackground: '#FFFFFF', text: '#18181B', line: '#18181B', accent: '#18181B' },
  { id: 'plain-page', name: '素页', group: '简约', rootBackground: '#3F3F46', rootText: '#FFFFFF', branchBackground: '#F4F4F5', nodeBackground: '#FFFFFF', text: '#27272A', line: '#52525B', accent: '#52525B' },
  { id: 'ink', name: '墨稿', group: '浅色', rootBackground: '#3F3F46', rootText: '#FFFFFF', branchBackground: '#F4F4F5', nodeBackground: '#FFFFFF', text: '#27272A', line: '#52525B', accent: '#71717A' },
  { id: 'parchment', name: '雁皮', group: '浅色', rootBackground: '#8B7A65', rootText: '#FFFFFF', branchBackground: '#F3EFE8', nodeBackground: '#FFFDFC', text: '#3F352C', line: '#8B7A65', accent: '#A58D72' },
  { id: 'breeze', name: '清风', group: '浅色', rootBackground: '#36A852', rootText: '#FFFFFF', branchBackground: '#EAF7ED', nodeBackground: '#FBFEFC', text: '#24452B', line: '#45A85B', accent: '#22C55E' },
  { id: 'pulse', name: '脉搏', group: '浅色', rootBackground: '#E9773E', rootText: '#FFFFFF', branchBackground: '#FFF0E8', nodeBackground: '#FFFCFA', text: '#563225', line: '#E9773E', accent: '#F97316' },
  { id: 'voyage', name: '远航', group: '浅色', rootBackground: '#2D91D6', rootText: '#FFFFFF', branchBackground: '#E8F4FC', nodeBackground: '#FBFDFF', text: '#1E3A4F', line: '#2D91D6', accent: '#0EA5E9' },
  { id: 'focus', name: '焦点', group: '深色', rootBackground: '#E4E4E7', rootText: '#18181B', branchBackground: '#3F3F46', nodeBackground: '#27272A', text: '#F4F4F5', line: '#A1A1AA', accent: '#D4D4D8' },
  { id: 'deep', name: '深潜', group: '深色', rootBackground: '#8298D2', rootText: '#101827', branchBackground: '#2B3249', nodeBackground: '#1F2536', text: '#E5E7EB', line: '#8298D2', accent: '#93A9E4' },
  { id: 'night', name: '夜图', group: '深色', rootBackground: '#8B6DB8', rootText: '#FFFFFF', branchBackground: '#33263F', nodeBackground: '#221B2B', text: '#F3E8FF', line: '#9C7AC4', accent: '#A78BFA' },
]

export const DEFAULT_MIND_MAP_THEME = MIND_MAP_THEMES[0]

export function resolveMindMapTheme(themeId?: string): MindMapTheme {
  const theme = MIND_MAP_THEMES.find((item) => item.id === themeId) ?? DEFAULT_MIND_MAP_THEME
  return { ...theme, line: theme.text }
}
