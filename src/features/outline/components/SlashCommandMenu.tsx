import React from 'react'
import type { SlashCommand } from '../hooks/useSlashCommandMenu'

interface SlashCommandMenuProps {
  commands: SlashCommand[]
  activeIndex: number
  onCommand: (key: string) => void
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  commands,
  activeIndex,
  onCommand,
}) => {
  return (
    <div className="ui-popover absolute left-16 top-9 z-50 w-60 p-1.5 font-sans text-xs">
      <div className="mb-1 border-b border-[var(--color-hairline-soft)] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-stone)]">
        织物指令
      </div>
      <div className="space-y-0.5">
        {commands.map((command, index) => (
          <button
            key={command.key}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onCommand(command.key)
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors focus:outline-none ${
              index === activeIndex
                ? 'bg-[var(--color-tint-lavender)] font-semibold text-[var(--color-primary-deep)]'
                : 'text-[var(--color-slate)] hover:bg-[var(--color-surface)]'
            }`}
          >
            <div>
              <div>{command.label}</div>
              <div className="mt-0.5 text-[10px] font-normal text-zinc-400">
                {command.desc}
              </div>
            </div>
            <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">
              {command.shortcut}
            </kbd>
          </button>
        ))}
      </div>
    </div>
  )
}
