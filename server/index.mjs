import { createServer } from 'node:http'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { contentTypeFor, createDocument, parseImport, serializeDocument } from './documentFormats.mjs'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dataDir = join(rootDir, 'server-data')
const dataFile = join(dataDir, 'workspace.json')
const distDir = join(rootDir, 'dist')
const port = Number(process.env.SIWEI_API_PORT || process.env.PORT || 5185)
let writeQueue = Promise.resolve()

async function loadWorkspace() {
  try {
    return JSON.parse(await readFile(dataFile, 'utf8'))
  } catch {
    const document = createDocument()
    const workspace = {
      items: [{ id: document.id, type: 'document', name: document.title, parentId: null, createdAt: document.createdAt, updatedAt: document.updatedAt }],
      documents: { [document.id]: document },
    }
    await persist(workspace)
    return workspace
  }
}

async function persist(workspace) {
  writeQueue = writeQueue.then(async () => {
    await mkdir(dataDir, { recursive: true })
    const temp = `${dataFile}.tmp`
    await writeFile(temp, JSON.stringify(workspace, null, 2), 'utf8')
    await rename(temp, dataFile)
  })
  return writeQueue
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url)
      return
    }
    await serveStatic(res, url.pathname)
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : String(error) })
  }
})

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true })
  const workspace = await loadWorkspace()

  if (req.method === 'GET' && url.pathname === '/api/workspace') {
    return json(res, 200, { items: workspace.items })
  }

  if (req.method === 'POST' && url.pathname === '/api/folders') {
    const body = await readJson(req)
    const timestamp = Date.now()
    const item = { id: randomUUID(), type: 'folder', name: cleanName(body.name, '新建文件夹'), parentId: body.parentId || null, createdAt: timestamp, updatedAt: timestamp }
    workspace.items.push(item)
    await persist(workspace)
    return json(res, 201, item)
  }

  if (req.method === 'POST' && url.pathname === '/api/documents') {
    const body = await readJson(req)
    const document = body.document ? { ...body.document } : createDocument(cleanName(body.name, '未命名文档'))
    document.id = randomUUID()
    document.title = cleanName(body.name || document.title, '未命名文档')
    document.root = { ...document.root, text: document.title }
    document.updatedAt = Date.now()
    const item = { id: document.id, type: 'document', name: document.title, parentId: body.parentId || null, createdAt: document.createdAt || Date.now(), updatedAt: document.updatedAt }
    workspace.items.push(item)
    workspace.documents[item.id] = document
    await persist(workspace)
    return json(res, 201, { item, document })
  }

  const documentMatch = url.pathname.match(/^\/api\/documents\/([^/]+)$/)
  if (documentMatch && req.method === 'GET') {
    const document = workspace.documents[documentMatch[1]]
    return document ? json(res, 200, document) : json(res, 404, { error: '文档不存在' })
  }
  if (documentMatch && req.method === 'PUT') {
    const id = documentMatch[1]
    if (!workspace.documents[id]) return json(res, 404, { error: '文档不存在' })
    const body = await readJson(req)
    const document = { ...body.document, id, updatedAt: Date.now() }
    workspace.documents[id] = document
    workspace.items = workspace.items.map((item) => item.id === id ? { ...item, name: document.title, updatedAt: document.updatedAt } : item)
    await persist(workspace)
    return json(res, 200, document)
  }

  const itemMatch = url.pathname.match(/^\/api\/items\/([^/]+)$/)
  if (itemMatch && req.method === 'PATCH') {
    const id = itemMatch[1]
    const item = workspace.items.find((candidate) => candidate.id === id)
    if (!item) return json(res, 404, { error: '项目不存在' })
    const body = await readJson(req)
    if (body.parentId === id) return json(res, 400, { error: '不能移动到自身' })
    const descendants = collectDescendants(workspace.items, id)
    if (body.parentId && descendants.has(body.parentId)) return json(res, 400, { error: '不能移动到子文件夹' })
    const next = { ...item, name: body.name === undefined ? item.name : cleanName(body.name, item.name), parentId: body.parentId === undefined ? item.parentId : body.parentId || null, updatedAt: Date.now() }
    workspace.items = workspace.items.map((candidate) => candidate.id === id ? next : candidate)
    if (next.type === 'document' && workspace.documents[id]) {
      workspace.documents[id] = { ...workspace.documents[id], title: next.name, root: { ...workspace.documents[id].root, text: next.name }, updatedAt: next.updatedAt }
    }
    await persist(workspace)
    return json(res, 200, next)
  }
  const duplicateMatch = url.pathname.match(/^\/api\/items\/([^/]+)\/duplicate$/)
  if (duplicateMatch && req.method === 'POST') {
    const sourceId = duplicateMatch[1]
    const source = workspace.items.find((item) => item.id === sourceId)
    if (!source) return json(res, 404, { error: '项目不存在' })
    const idMap = new Map()
    const sourceIds = collectDescendants(workspace.items, sourceId)
    const ordered = workspace.items.filter((item) => sourceIds.has(item.id)).sort((a, b) => a.id === sourceId ? -1 : b.id === sourceId ? 1 : 0)
    const timestamp = Date.now()
    const copies = ordered.map((item) => {
      const nextId = randomUUID(); idMap.set(item.id, nextId)
      return { ...item, id: nextId, name: item.id === sourceId ? `${item.name} 副本` : item.name, parentId: item.id === sourceId ? item.parentId : idMap.get(item.parentId) || item.parentId, createdAt: timestamp, updatedAt: timestamp }
    })
    copies.forEach((copy, index) => {
      const original = ordered[index]
      if (original.type === 'document' && workspace.documents[original.id]) workspace.documents[copy.id] = { ...structuredClone(workspace.documents[original.id]), id: copy.id, title: copy.name, root: { ...structuredClone(workspace.documents[original.id].root), text: copy.name }, createdAt: timestamp, updatedAt: timestamp }
    })
    workspace.items.push(...copies)
    await persist(workspace)
    return json(res, 201, { items: copies, root: copies[0] })
  }
  if (itemMatch && req.method === 'DELETE') {
    const ids = collectDescendants(workspace.items, itemMatch[1])
    workspace.items = workspace.items.filter((item) => !ids.has(item.id))
    for (const id of ids) delete workspace.documents[id]
    await persist(workspace)
    return json(res, 200, { ok: true })
  }

  if (req.method === 'POST' && url.pathname === '/api/import/preview') {
    const body = await readJson(req)
    const document = parseImport(String(body.content || ''), String(body.format || 'json'), String(body.filename || ''))
    return json(res, 200, createImportPreview(document))
  }

  if (req.method === 'POST' && url.pathname === '/api/export') {
    const body = await readJson(req)
    const format = String(body.format || 'json')
    const content = serializeDocument(body.document, format)
    const filename = `${cleanName(body.document?.title, '未命名文档')}.${extensionFor(format)}`
    res.writeHead(200, {
      'content-type': contentTypeFor(format),
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'cache-control': 'no-store',
    })
    res.end(content)
    return
  }

  json(res, 404, { error: '接口不存在' })
}

function collectDescendants(items, rootId) {
  const ids = new Set([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const item of items) {
      if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
        ids.add(item.id)
        changed = true
      }
    }
  }
  return ids
}

function createImportPreview(document) {
  let nodeCount = 0
  let maxDepth = 0
  let taskCount = 0
  let tagCount = 0
  let noteCount = 0
  const tags = new Set()
  const visit = (node, depth) => {
    nodeCount += 1
    maxDepth = Math.max(maxDepth, depth)
    if (node.checked !== undefined) taskCount += 1
    if (node.note) noteCount += 1
    ;(node.tags || []).forEach((tag) => tags.add(tag))
    node.children.forEach((child) => visit(child, depth + 1))
  }
  document.root.children.forEach((child) => visit(child, 1))
  tagCount = tags.size
  return { document, summary: { title: document.title, nodeCount, maxDepth, taskCount, tagCount, noteCount, warningCount: 0 }, report: { items: [] } }
}

async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 10 * 1024 * 1024) throw new Error('请求内容超过 10MB')
    chunks.push(chunk)
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

async function serveStatic(res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  let filePath = resolve(distDir, relative)
  if (!filePath.startsWith(distDir)) return json(res, 403, { error: '禁止访问' })
  try {
    const data = await readFile(filePath)
    res.writeHead(200, { 'content-type': mime(extname(filePath)) })
    res.end(data)
  } catch {
    filePath = join(distDir, 'index.html')
    try {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(await readFile(filePath))
    } catch {
      json(res, 404, { error: '请先运行 pnpm build' })
    }
  }
}

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}

function cleanName(value, fallback) {
  return String(value || '').trim().slice(0, 120) || fallback
}

function extensionFor(format) {
  return ({ markdown: 'md', opml: 'opml', html: 'html', text: 'txt', json: 'siwei.json' })[format] || 'txt'
}

function mime(extension) {
  return ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' })[extension] || 'application/octet-stream'
}

server.listen(port, '0.0.0.0', () => {
  console.log(`Siwei web server listening on http://0.0.0.0:${port}`)
})
