import React from 'react'
import { Check } from 'lucide-react'

import type { MindMapAppearance } from '../../types/document'
import { MIND_MAP_THEMES } from './mindMapThemes'

const BACKGROUNDS = ['#FFFFFF', '#F8FAFC', '#FFF7ED', '#F0FDF4', '#EFF6FF', '#F5F3FF', '#18181B']

interface MindMapAppearancePanelProps {
  appearance: MindMapAppearance
  onChange: (appearance: MindMapAppearance) => void
}

export const MindMapAppearancePanel: React.FC<MindMapAppearancePanelProps> = ({ appearance, onChange }) => (
  <div className="absolute right-0 top-11 z-30 w-[420px] max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
    <div className="mb-3 text-sm font-semibold text-zinc-900">配色</div>
    {(['简约', '浅色', '深色'] as const).map((group) => (
      <div key={group} className="mb-4">
        <div className="mb-2 text-xs font-medium text-zinc-400">{group}</div>
        <div className="grid grid-cols-3 gap-2">
          {MIND_MAP_THEMES.filter((theme) => theme.group === group).map((theme) => {
            const active = (appearance.themeId ?? 'pure') === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                aria-label={`配色 ${theme.name}`}
                onClick={() => onChange({ themeId: theme.id })}
                className={`relative rounded-lg border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${active ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-zinc-200'}`}
                style={{ backgroundColor: group === '深色' ? theme.nodeBackground : '#FFFFFF' }}
              >
                <div className="mb-2 text-xs font-semibold" style={{ color: group === '深色' ? theme.text : '#3F3F46' }}>{theme.name}</div>
                <div className="flex items-center gap-1">
                  <span className="h-4 w-8 rounded-sm" style={{ backgroundColor: theme.rootBackground }} />
                  <span className="h-3 w-5 rounded-sm" style={{ backgroundColor: theme.branchBackground }} />
                  <span className="h-px flex-1" style={{ backgroundColor: theme.text }} />
                </div>
                {active && <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-indigo-600" />}
              </button>
            )
          })}
        </div>
      </div>
    ))}
    <div className="border-t border-zinc-100 pt-3">
      <div className="mb-2 text-xs font-medium text-zinc-500">背景色</div>
      <div className="flex items-center gap-2">
        {BACKGROUNDS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`背景色 ${color}`}
            onClick={() => onChange({ backgroundColor: color })}
            className={`h-7 w-7 rounded-md border shadow-sm ${appearance.backgroundColor === color ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-zinc-200'}`}
            style={{ backgroundColor: color }}
          />
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-zinc-500">
          自定义
          <input
            aria-label="自定义背景颜色"
            type="color"
            value={appearance.backgroundColor ?? '#FFFFFF'}
            onChange={(event) => onChange({ backgroundColor: event.target.value.toUpperCase() })}
            className="h-7 w-9 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
          />
        </label>
      </div>
    </div>
  </div>
)
