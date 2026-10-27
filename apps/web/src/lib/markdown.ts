const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function inline(escaped: string): string {
  return escaped.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

/**
 * A small, safe Markdown renderer for file previews: everything is escaped first, so raw HTML in a file stays text, and
 * links and images are left as plain text. It handles headings, lists, fenced code, inline code and bold, nothing more.
 */
export function renderMarkdown(source: string): string {
  const out: string[] = []
  let inCode = false
  let inList = false
  const closeList = () => {
    if (inList) out.push('</ul>')
    inList = false
  }
  for (const line of source.split(/\r?\n/)) {
    if (line.startsWith('```')) {
      closeList()
      out.push(inCode ? '</pre>' : '<pre>')
      inCode = !inCode
      continue
    }
    if (inCode) {
      out.push(escapeHtml(line))
      continue
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    if (heading) {
      closeList()
      out.push(`<h${heading[1]!.length}>${inline(escapeHtml(heading[2]!))}</h${heading[1]!.length}>`)
    } else if (bullet) {
      if (!inList) out.push('<ul>')
      inList = true
      out.push(`<li>${inline(escapeHtml(bullet[1]!))}</li>`)
    } else if (line.trim() === '') closeList()
    else {
      closeList()
      out.push(`<p>${inline(escapeHtml(line))}</p>`)
    }
  }
  closeList()
  if (inCode) out.push('</pre>')
  return out.join('\n')
}

const HEAD =
  '<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'">' +
  '<style>body{font:14px/1.5 system-ui,sans-serif;color:#e6e6e6;background:#15171a;margin:0;padding:12px}pre{white-space:pre-wrap;word-break:break-word;font:13px ui-monospace,Consolas,monospace}code{font-family:ui-monospace,Consolas,monospace}img{max-width:100%}</style>'

/** The document a preview iframe shows. The iframe has no scripts and no access to the app; this adds a policy on top. */
export function previewDocument(preview: { kind: string; text?: string; dataUrl?: string; note?: string }): string {
  if (preview.kind === 'markdown') return `${HEAD}${renderMarkdown(preview.text ?? '')}`
  if (preview.kind === 'image') return `${HEAD}<img alt="" src="${escapeHtml(preview.dataUrl ?? '')}">`
  if (preview.kind === 'code' || preview.kind === 'text') return `${HEAD}<pre>${escapeHtml(preview.text ?? '')}</pre>`
  return `${HEAD}<p>${escapeHtml(preview.note ?? 'No preview.')}</p>`
}
