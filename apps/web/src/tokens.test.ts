/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const css = readFileSync('src/index.css', 'utf8') // vitest runs from apps/web

// Spec 14: every text/background token pair we use must hold at least 4.5:1.
const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')))

function hex(name: string): [number, number, number] {
  const m = new RegExp(`--${name}:\\s*#([0-9a-f]{6})`, 'i').exec(root)
  if (!m) throw new Error(`token --${name} is not a 6-digit hex colour`)
  const n = parseInt(m[1]!, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Alpha of an rgba(255,255,255,a) panel token. */
function whiteAlpha(name: string): number {
  const m = new RegExp(`--${name}:\\s*rgba\\(255,\\s*255,\\s*255,\\s*([0-9.]+)\\)`).exec(root)
  if (!m) throw new Error(`token --${name} is not a white rgba`)
  return Number(m[1])
}

function over(fg: [number, number, number], alpha: number, bg: [number, number, number]) {
  return fg.map((c, i) => c * alpha + bg[i]! * (1 - alpha)) as [number, number, number]
}

function luminance([r, g, b]: [number, number, number]): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

describe('design tokens', () => {
  const bg = hex('bg')
  const panel = over([255, 255, 255], whiteAlpha('panel'), bg)
  const panelStrong = over([255, 255, 255], whiteAlpha('panel-strong'), bg)

  it.each([
    ['accent-fg on accent (primary buttons)', hex('accent-fg'), hex('accent')],
    ['text on background', hex('text'), bg],
    ['text on panel', hex('text'), panel],
    ['text-dim on background', hex('text-dim'), bg],
    ['text-dim on panel', hex('text-dim'), panel],
    ['text-dim on panel-strong', hex('text-dim'), panelStrong],
    ['ok on panel', hex('ok'), panel],
    ['warn on panel', hex('warn'), panel],
    ['bad on panel', hex('bad'), panel],
  ])('%s is at least 4.5:1', (_name, fg, back) => {
    expect(contrast(fg, back)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the accent soft green and apart from the teal status colour', () => {
    const [r, g, b] = hex('accent')
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
    expect(hex('accent')).not.toEqual(hex('ok'))
  })
})
