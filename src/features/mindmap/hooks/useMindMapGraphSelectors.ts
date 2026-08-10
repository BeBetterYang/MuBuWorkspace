import React from 'react'
import type { OutlineDocument } from '../../../types/document'
import {
  getChildIndexMap,
  getDescendantIds,
  getNodeDepthMap,
  getNodeSubtree,
  getParentIdMap,
  getVisibleMindMapNodeIds,
} from '../mindMapSelectors'

interface MindMapGraphSelectorOptions {
  currentDoc: OutlineDocument | null
  collapsedNodeIds: Set<string>
  validFocusRootNodeId: string | null
}

export function useMindMapGraphSelectors({
  currentDoc,
  collapsedNodeIds,
  validFocusRootNodeId,
}: MindMapGraphSelectorOptions) {
  const structureKey = React.useMemo(
    () => currentDoc ? `${currentDoc.id}:${createStructureSignature(currentDoc.root)}` : '',
    [currentDoc?.id, currentDoc?.root],
  )
  // Content edits create a new root object, while these selectors only depend
  // on ids and parent/child relationships.
  const structuralRoot = React.useMemo(() => currentDoc?.root ?? null, [structureKey])

  const depthByNodeId = React.useMemo(
    () => structuralRoot ? getNodeDepthMap(structuralRoot) : new Map<string, number>(),
    [structuralRoot],
  )

  const parentByNodeId = React.useMemo(
    () => structuralRoot ? getParentIdMap(structuralRoot) : new Map<string, string | null>(),
    [structuralRoot],
  )

  const childIndexByNodeId = React.useMemo(
    () => structuralRoot ? getChildIndexMap(structuralRoot) : new Map<string, number>(),
    [structuralRoot],
  )

  const getNodeDescendantIds = React.useCallback((nodeId: string): Set<string> => {
    return structuralRoot ? getDescendantIds(structuralRoot, nodeId) : new Set<string>()
  }, [structuralRoot])

  const visibleNodeIds = React.useMemo(() => {
    if (!structuralRoot) return new Set<string>()
    return new Set(getVisibleMindMapNodeIds(structuralRoot, collapsedNodeIds, validFocusRootNodeId))
  }, [collapsedNodeIds, structuralRoot, validFocusRootNodeId])

  const graphRootNode = React.useMemo(() => {
    if (!structuralRoot) return null
    return validFocusRootNodeId
      ? getNodeSubtree(structuralRoot, validFocusRootNodeId)
      : structuralRoot
  }, [structuralRoot, validFocusRootNodeId])

  return {
    depthByNodeId,
    parentByNodeId,
    childIndexByNodeId,
    getNodeDescendantIds,
    visibleNodeIds,
    graphRootNode,
    structureKey,
  }
}

function createStructureSignature(root: OutlineDocument['root']): string {
  const parts: string[] = []
  const visit = (node: OutlineDocument['root']) => {
    parts.push(node.id, '[', node.children.map((child) => child.id).join(','), ']')
    if (node.summary) parts.push('{', node.summary.nodeIds.join(','), '}')
    node.children.forEach(visit)
  }
  visit(root)
  return parts.join('')
}
