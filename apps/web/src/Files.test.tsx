import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FileEntry, FileFolder, FileListing, FilePreview, FileSearchResponse, ProjectRecord } from '@junos/shared'
import Files from './pages/Files'
import { previewDocument, renderMarkdown } from './lib/markdown'

const folder = (over: Partial<FileFolder> = {}): FileFolder => ({
  id: '11111111-1111-4111-8111-111111111111',
  path: 'E:\\Work',
  label: 'Work',
  addedAt: '2026-10-23T08:00:00.000Z',
  scannedAt: '2026-10-23T08:00:05.000Z',
  status: 'ready',
  fileCount: 12,
  projectCount: 1,
  ...over,
})

const entry = (over: Partial<FileEntry> = {}): FileEntry => ({ folderId: folder().id, path: 'notes/plan.md', name: 'plan.md', kind: 'markdown', size: 2048, modifiedAt: '2026-10-22T08:00:00.000Z', projectId: null, ...over })

const project = (): ProjectRecord => ({
  id: 'p1',
  name: 'junos',
  path: 'E:\\Work\\junos',
  folderId: folder().id,
  fileCount: 40,
  languages: [{ ext: 'ts', count: 30 }],
  branch: 'main',
  lastCommit: { at: '2026-10-22T08:00:00.000Z', subject: 'Add files' },
  dirty: 2,
  activity: [0, 0, 1, 0, 3, 0, 0, 0, 0, 2, 0, 0, 0, 1],
})

interface Daemon {
  folders?: FileFolder[]
  projects?: ProjectRecord[]
  listing?: FileListing
  search?: FileSearchResponse
  preview?: FilePreview
  addStatus?: number
  messageBody?: unknown
}

function mockDaemon(opts: Daemon = {}) {
  const calls: Array<{ path: string; method: string; body?: any }> = []
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const raw = String(input).replace(/^\/api/, '')
      const path = raw.split('?')[0]!
      const method = init.method ?? 'GET'
      const body = init.body ? JSON.parse(init.body as string) : undefined
      calls.push({ path: raw, method, body })
      if (path === '/files/folders' && method === 'GET') return json({ folders: opts.folders ?? [folder()] })
      if (path === '/files/folders' && method === 'POST') return opts.addStatus ? json({ error: 'too_broad', message: 'That is too broad.' }, opts.addStatus) : json(folder(), 201)
      if (/^\/files\/folders\/[^/]+$/.test(path) && method === 'DELETE') return json({ folderId: folder().id, removed: { files: 12, projects: 1, searchEntries: 12 } })
      if (path === '/files/projects') return json({ projects: opts.projects ?? [] })
      if (path === '/files/list') return json(opts.listing ?? { folderId: folder().id, dir: '', dirs: ['notes'], files: [entry({ path: 'readme.md', name: 'readme.md' })] })
      if (path === '/files/search') return json(opts.search ?? { understood: { text: 'gateway', types: [], days: null }, hits: [] })
      if (path === '/files/preview') return json(opts.preview ?? { kind: 'markdown', name: 'plan.md', size: 10, text: '# Plan', truncated: false })
      if (path === '/conversations' && method === 'POST') return json({ id: 'c1' }, 201)
      if (/^\/conversations\/c1\/messages$/.test(path)) return json(opts.messageBody ?? { status: 'started' }, 200)
      return json({}, 200)
    }),
  )
  return calls
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('markdown preview', () => {
  it('escapes everything, so raw HTML in a file stays text', () => {
    const html = renderMarkdown('# Title <img src=x onerror=alert(1)>\n<script>alert(1)</script>\n- item **bold** `code`\n```\n<b>raw</b>\n```\n[link](javascript:alert(1))')
    expect(html).not.toMatch(/<script|<img|<b>/)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('<h1>Title &lt;img')
    expect(html).toContain('<li>item <strong>bold</strong> <code>code</code></li>')
    expect(html).toContain('<pre>\n&lt;b&gt;raw&lt;/b&gt;\n</pre>')
    expect(html).not.toContain('<a ')
  })

  it('builds a document with a policy that allows no scripts, no connections and only data images', () => {
    const doc = previewDocument({ kind: 'code', text: '</pre><script>alert(1)</script>' })
    expect(doc).toContain("default-src 'none'")
    expect(doc).toContain("img-src data:")
    expect(doc).not.toContain('<script>alert')
    expect(doc).toContain('&lt;/pre&gt;&lt;script&gt;')
    expect(previewDocument({ kind: 'image', dataUrl: 'data:image/png;base64,AAAA" onerror="x' })).not.toMatch(/onerror="x"/)
  })
})

describe('Files page', () => {
  it('lists folders with their counts, the projects, and the folder contents', async () => {
    mockDaemon({ projects: [project()] })
    render(<Files />)
    const folders = await screen.findByLabelText('Folders')
    expect(within(folders).getByText(/12 files · 1 projects/)).toBeTruthy()
    const p = await screen.findByRole('article', { name: 'junos' })
    expect(within(p).getByText(/main · 2 changed · 40 files/)).toBeTruthy()
    expect(within(p).getByText(/Add files/)).toBeTruthy()
    expect(within(p).getByLabelText('14-day activity').textContent).toHaveLength(14)
    expect(within(p).getByRole('link', { name: 'Show board' }).getAttribute('href')).toBe('/board?project=junos')
    const browser = await screen.findByLabelText('Browser')
    expect(await within(browser).findByText('notes/')).toBeTruthy()
    expect(within(browser).getByText('readme.md')).toBeTruthy()
  })

  it('adds a folder, and shows why one was refused', async () => {
    const calls = mockDaemon()
    render(<Files />)
    fireEvent.change(await screen.findByLabelText('Folder path'), { target: { value: 'E:\\Work\\More' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add folder' }))
    await waitFor(() => expect(calls.find((c) => c.path === '/files/folders' && c.method === 'POST')).toBeTruthy())
    expect(calls.find((c) => c.path === '/files/folders' && c.method === 'POST')!.body).toEqual({ path: 'E:\\Work\\More' })
    cleanup()
    vi.unstubAllGlobals()
    mockDaemon({ addStatus: 400 })
    render(<Files />)
    fireEvent.change(await screen.findByLabelText('Folder path'), { target: { value: 'C:\\' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add folder' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/too broad/)
  })

  it('asks before removing a folder, then says what was deleted', async () => {
    const calls = mockDaemon()
    render(<Files />)
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Work' }))
    expect(screen.getByText(/Remove it and delete its index \(12 files, its search entries and projects\)\?/)).toBeTruthy()
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Work' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, remove' }))
    expect((await screen.findByRole('status')).textContent).toBe('Removed the folder. Deleted 12 indexed files, 12 search entries and 1 projects.')
    expect(calls.some((c) => c.method === 'DELETE')).toBe(true)
  })

  it('searches in words, shows the matches marked as text, and what the question was understood as', async () => {
    const calls = mockDaemon({
      search: {
        understood: { text: 'api', types: ['pdf'], days: 7 },
        hits: [{ ...entry({ path: 'docs/api.md', name: 'api.md' }), snippet: 'rotate the [[api]] <b>keys</b> weekly' }],
      },
    })
    render(<Files />)
    fireEvent.change(await screen.findByLabelText('Search files'), { target: { value: 'PDFs from last week about the API' } })
    fireEvent.change(screen.getByLabelText('File type'), { target: { value: 'pdf' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    const results = await screen.findByLabelText('Search results')
    expect(calls.find((c) => c.path.startsWith('/files/search'))!.path).toContain('q=PDFs%20from%20last%20week%20about%20the%20API&type=pdf')
    expect(within(results).getByText(/“api” · pdf · changed in the last 7 days/)).toBeTruthy()
    expect(within(results).getByText('api', { selector: 'mark' })).toBeTruthy()
    expect(results.querySelector('b')).toBeNull() // the snippet is text, never markup
    expect(within(results).getByText(/<b>keys<\/b>/)).toBeTruthy()
  })

  it('previews a file in a sandboxed frame with no scripts, and the file’s HTML stays text', async () => {
    mockDaemon({ preview: { kind: 'markdown', name: 'plan.md', size: 10, text: '# Plan\n<script>alert(1)</script>', truncated: false } })
    render(<Files />)
    fireEvent.click(await screen.findByRole('button', { name: 'readme.md' }))
    const frame = (await screen.findByTitle('Preview of readme.md')) as HTMLIFrameElement
    expect(frame.getAttribute('sandbox')).toBe('')
    expect(frame.hasAttribute('src')).toBe(false)
    const doc = frame.getAttribute('srcdoc')!
    expect(doc).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(doc).not.toContain('<script>')
    expect(doc).toContain("default-src 'none'")
  })

  it('offers a download for a PDF and a note instead of a preview', async () => {
    mockDaemon({ preview: { kind: 'pdf', name: 'report.pdf', size: 10, note: 'PDF previews are not shown here. Use Download to open it.' } })
    render(<Files />)
    fireEvent.click(await screen.findByRole('button', { name: 'readme.md' }))
    const preview = await screen.findByLabelText('Preview')
    const link = await within(preview).findByRole('link', { name: 'Download' })
    expect(link.getAttribute('href')).toMatch(/^\/api\/files\/raw\?folder=.*&path=readme\.md$/)
    expect(screen.queryByLabelText('Ask about this file')).toBeNull()
  })

  it('opens a project in Chat, and attaches a file to a question', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    const calls = mockDaemon({ projects: [project()], listing: { folderId: folder().id, dir: '', dirs: [], files: [entry({ path: 'readme.md', name: 'readme.md', projectId: 'p1' })] } })
    render(<Files />)
    fireEvent.click(await screen.findByRole('button', { name: 'Open in Chat' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/chat?c=c1'))
    expect(calls.find((c) => c.path === '/conversations')!.body).toMatchObject({ provider: 'claude', projectId: 'p1' })
    assign.mockClear()
    fireEvent.click(await screen.findByRole('button', { name: 'readme.md' }))
    fireEvent.change(await screen.findByLabelText('Ask about this file'), { target: { value: 'what is this?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ask in Chat' }))
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/chat?c=c1'))
    expect(calls.find((c) => c.path === '/conversations/c1/messages')!.body).toEqual({ content: 'what is this?', attachments: [{ folderId: folder().id, path: 'readme.md' }] })
  })

  it('says nothing was sent when the provider notice has not been accepted', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { ...window.location, assign })
    mockDaemon({ messageBody: { status: 'disclosure_required', provider: 'claude', text: 'x' } })
    render(<Files />)
    fireEvent.click(await screen.findByRole('button', { name: 'readme.md' }))
    fireEvent.change(await screen.findByLabelText('Ask about this file'), { target: { value: 'hi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ask in Chat' }))
    expect((await screen.findByRole('status')).textContent).toMatch(/The file was not sent/)
    expect(assign).not.toHaveBeenCalled()
  })
})
