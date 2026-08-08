import { create } from 'zustand'
import {
  createServerDocument,
  createServerFolder,
  deleteServerItem,
  duplicateServerItem,
  getServerWorkspace,
  updateServerItem,
  type ServerWorkspaceItem,
} from '../../services/siweiApi'

interface ServerWorkspaceState {
  items: ServerWorkspaceItem[]
  loading: boolean
  error: string | null
  load: () => Promise<void>
  createFolder: (name: string, parentId: string | null) => Promise<ServerWorkspaceItem>
  createDocument: (name: string, parentId: string | null) => Promise<ServerWorkspaceItem>
  removeItem: (id: string) => Promise<void>
  updateItem: (id: string, patch: { name?: string; parentId?: string | null }) => Promise<ServerWorkspaceItem>
  duplicateItem: (id: string) => Promise<ServerWorkspaceItem>
}

export const useServerWorkspaceStore = create<ServerWorkspaceState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const result = await getServerWorkspace()
      set({ items: result.items, loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  createFolder: async (name, parentId) => {
    const item = await createServerFolder(name, parentId)
    set({ items: [...get().items, item] })
    return item
  },

  createDocument: async (name, parentId) => {
    const result = await createServerDocument(name, parentId)
    set({ items: [...get().items, result.item] })
    return result.item
  },

  removeItem: async (id) => {
    await deleteServerItem(id)
    const removed = new Set([id])
    let changed = true
    while (changed) {
      changed = false
      get().items.forEach((item) => {
        if (item.parentId && removed.has(item.parentId) && !removed.has(item.id)) {
          removed.add(item.id)
          changed = true
        }
      })
    }
    set({ items: get().items.filter((item) => !removed.has(item.id)) })
  },

  updateItem: async (id, patch) => {
    const item = await updateServerItem(id, patch)
    set({ items: get().items.map((candidate) => candidate.id === id ? item : candidate) })
    return item
  },

  duplicateItem: async (id) => {
    const result = await duplicateServerItem(id)
    set({ items: [...get().items, ...result.items] })
    return result.root
  },
}))
