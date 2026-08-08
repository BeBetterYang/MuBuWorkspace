import { randomUUID } from 'node:crypto'

const now = () => Date.now()

export function createDocument(title = '未命名文档') {
  const timestamp = now()
  const id = randomUUID()
  return {
    id,
    title,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    root: {
      id: randomUUID(),
      text: title,
      createdAt: timestamp,
      updatedAt: timestamp,
      children: [{
        id: randomUUID(),
        text: '开始记录你的想法',
        createdAt: timestamp,
        updatedAt: timestamp,
        children: [],
      }],
    },
  }
}

export function parseImport(content, format, filename = '') {
  if (format === 'json') {
    const parsed = JSON.parse(content)
    const doc = parsed.document ?? parsed
    validateDocument(doc)
    return normalizeDocument(doc)
  }
  if (format === 'opml') return parseOpml(content, filename)
  return parseMarkdown(content, filename)
}

export function serializeDocument(doc, format) {
  switch (format) {
    case 'markdown': return toMarkdown(doc)
    case 'opml': return toOpml(doc)
    case 'html': return toHtml(doc)
    case 'text': return toPlainText(doc)
    case 'json':
    default: return JSON.stringify(doc, null, 2)
  }
}

export function contentTypeFor(format) {
  return {
    markdown: 'text/markdown; charset=utf-8',
    opml: 'text/x-opml; charset=utf-8',
    html: 'text/html; charset=utf-8',
    text: 'text/plain; charset=utf-8',
    json: 'application/json; charset=utf-8',
  }[format] ?? 'application/octet-stream'
}

function normalizeDocument(doc) {
  const timestamp = now()
  const normalizeNode = (node) => ({
    ...node,
    id: node.id || randomUUID(),
    text: String(node.text ?? ''),
    createdAt: Number(node.createdAt) || timestamp,
    updatedAt: Number(node.updatedAt) || timestamp,
    children: Array.isArray(node.children) ? node.children.map(normalizeNode) : [],
  })
  return {
    ...doc,
    id: doc.id || randomUUID(),
    title: String(doc.title || '导入文档'),
    version: Number(doc.version) || 1,
    createdAt: Number(doc.createdAt) || timestamp,
    updatedAt: timestamp,
    root: normalizeNode(doc.root),
  }
}

function validateDocument(doc) {
  if (!doc || typeof doc !== 'object' || !doc.root || typeof doc.root !== 'object') {
    throw new Error('JSON 不是有效的 Siwei 文档')
  }
}

function parseMarkdown(content, filename) {
  const timestamp = now()
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || fileStem(filename) || '导入文档'
  const root = node(title, timestamp)
  const stack = [{ depth: -1, value: root }]
  for (const rawLine of content.split(/\r?\n/)) {
    const match = rawLine.match(/^(\s*)(?:[-*+]\s+|#{2,6}\s+)(?:\[([ xX])\]\s+)?(.+)$/)
    if (!match) continue
    const depth = Math.floor(match[1].replace(/\t/g, '  ').length / 2)
    const value = node(match[3].trim(), timestamp)
    if (match[2]) value.checked = match[2].toLowerCase() === 'x'
    while (stack.length > 1 && stack.at(-1).depth >= depth) stack.pop()
    stack.at(-1).value.children.push(value)
    stack.push({ depth, value })
  }
  return normalizeDocument({ id: randomUUID(), title, version: 1, createdAt: timestamp, updatedAt: timestamp, root })
}

function parseOpml(content, filename) {
  const timestamp = now()
  const title = decodeXml(content.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || fileStem(filename) || '导入文档')
  const root = node(title, timestamp)
  const stack = [root]
  const tokens = content.match(/<outline\b[^>]*\/?\s*>|<\/outline>/gi) ?? []
  for (const token of tokens) {
    if (/^<\/outline/i.test(token)) {
      if (stack.length > 1) stack.pop()
      continue
    }
    const text = decodeXml(token.match(/(?:text|title)=["']([^"']*)["']/i)?.[1] || '')
    const value = node(text, timestamp)
    stack.at(-1).children.push(value)
    if (!/\/\s*>$/.test(token)) stack.push(value)
  }
  return normalizeDocument({ id: randomUUID(), title, version: 1, createdAt: timestamp, updatedAt: timestamp, root })
}

function node(text, timestamp) {
  return { id: randomUUID(), text, createdAt: timestamp, updatedAt: timestamp, children: [] }
}

function toMarkdown(doc) {
  const lines = [`# ${doc.title}`, '']
  const visit = (item, depth) => {
    const task = item.checked === undefined ? '' : `[${item.checked ? 'x' : ' '}] `
    lines.push(`${'  '.repeat(depth)}- ${task}${item.text}`)
    item.children.forEach((child) => visit(child, depth + 1))
  }
  doc.root.children.forEach((child) => visit(child, 0))
  return `${lines.join('\n')}\n`
}

function toPlainText(doc) {
  const lines = [doc.title]
  const visit = (item, depth) => {
    lines.push(`${'  '.repeat(depth)}${item.text}`)
    item.children.forEach((child) => visit(child, depth + 1))
  }
  doc.root.children.forEach((child) => visit(child, 1))
  return `${lines.join('\n')}\n`
}

function toOpml(doc) {
  const visit = (item, depth) => {
    const attrs = [`text="${escapeXml(item.text)}"`]
    if (item.note) attrs.push(`_note="${escapeXml(item.note)}"`)
    if (!item.children.length) return `${'  '.repeat(depth)}<outline ${attrs.join(' ')} />`
    return `${'  '.repeat(depth)}<outline ${attrs.join(' ')}>\n${item.children.map((child) => visit(child, depth + 1)).join('\n')}\n${'  '.repeat(depth)}</outline>`
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>${escapeXml(doc.title)}</title></head>\n  <body>\n${doc.root.children.map((child) => visit(child, 2)).join('\n')}\n  </body>\n</opml>\n`
}

function toHtml(doc) {
  const visit = (item) => `<li>${escapeHtml(item.text)}${item.children.length ? `<ul>${item.children.map(visit).join('')}</ul>` : ''}</li>`
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(doc.title)}</title><style>body{max-width:860px;margin:40px auto;padding:0 24px;font:16px/1.7 system-ui;color:#27272a}li{margin:4px 0}</style></head><body><h1>${escapeHtml(doc.title)}</h1><ul>${doc.root.children.map(visit).join('')}</ul></body></html>`
}

function fileStem(filename) {
  return filename.replace(/\.[^.]+$/, '')
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

const escapeXml = escapeHtml
const decodeXml = (value) => String(value).replace(/&(amp|lt|gt|quot|#39);/g, (_, key) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[key])
