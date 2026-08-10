import React from 'react'
import { OutlineInlineContent } from '../OutlineInlineContent'

interface OutlineNodeTextContentProps {
  text: string
}

export const OutlineNodeTextContent: React.FC<OutlineNodeTextContentProps> = ({
  text,
}) => {
  return (
    <div className="min-w-0">
      <div
        className="truncate select-none text-sm font-medium leading-relaxed text-current"
      >
        {text ? (
          <OutlineInlineContent text={text} />
        ) : (
          <span className="font-normal italic text-zinc-400">空白织线</span>
        )}
      </div>
    </div>
  )
}
