import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDocument } from '../test/fixtures'
import * as api from './siweiApi'

describe('siweiApi web server client', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('loads the server workspace', async () => {
    const response = { items: [{ id: 'doc-1', type: 'document', name: 'test', parentId: null, createdAt: 1, updatedAt: 1 }] }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } })))
    await expect(api.getServerWorkspace()).resolves.toEqual(response)
    expect(fetch).toHaveBeenCalledWith('/api/workspace', expect.objectContaining({ headers: expect.any(Object) }))
  })

  it('saves a document through the server API', async () => {
    const doc = createDocument()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ document: doc }), { status: 200, headers: { 'content-type': 'application/json' } })))
    await api.saveDocument('doc-1', doc)
    expect(fetch).toHaveBeenCalledWith('/api/documents/doc-1', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ document: doc }) }))
  })

  it('previews a browser-selected import file', async () => {
    const preview = { document: createDocument(), summary: {}, report: { items: [] } }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(preview), { status: 200, headers: { 'content-type': 'application/json' } })))
    const file = new File(['# Title\n- Node'], 'demo.md', { type: 'text/markdown' })
    await expect(api.previewImportFile(file, 'markdown')).resolves.toEqual(preview)
    expect(fetch).toHaveBeenCalledWith('/api/import/preview', expect.objectContaining({ method: 'POST' }))
  })

  it('reports server errors instead of silently falling back to memory', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'unavailable' }), { status: 503, headers: { 'content-type': 'application/json' } })))
    await expect(api.getServerWorkspace()).rejects.toThrow('unavailable')
  })
})
