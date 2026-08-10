import React from 'react'

import type { OutlineDocument } from '../../../types/document'
import { findNodeById } from '../mindMapActions'

interface MindMapFocusFeedbackOptions {
  currentDoc: OutlineDocument | null
  focusedNodeId: string | null
  setFeedback: (message: string | null) => void
}

export function useMindMapFocusFeedback({
  currentDoc,
  focusedNodeId,
  setFeedback,
}: MindMapFocusFeedbackOptions) {
  const focusedNodeTitle = React.useMemo(() => {
    if (!currentDoc || !focusedNodeId) return null
    return findNodeById(currentDoc.root, focusedNodeId)?.text ?? null
  }, [currentDoc, focusedNodeId])

  React.useEffect(() => {
    if (focusedNodeTitle) {
      setFeedback(`已聚焦当前分支：${focusedNodeTitle}`)
      return
    }
    setFeedback(null)
  }, [focusedNodeTitle, setFeedback])
}
