/**
 * A forgiving match: every letter of the query must appear in the text, in order. Higher is better, -1 means no match.
 * Runs of letters, matches at the start of a word and an early start score more, so "sch" finds "Scheduled" before "Hermes console".
 */
export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().replace(/\s+/g, '')
  if (!q) return 0
  const t = text.toLowerCase()
  let score = 0
  let at = 0
  let run = 0
  for (const ch of q) {
    const found = t.indexOf(ch, at)
    if (found === -1) return -1
    const wordStart = found === 0 || /[\s\-_/&:]/.test(t[found - 1]!)
    run = found === at && at > 0 ? run + 1 : 0
    score += 10 + run * 8 + (wordStart ? 12 : 0) - Math.min(found - at, 6)
    at = found + 1
  }
  return score + (t.startsWith(q) ? 40 : 0) - Math.floor(t.length / 20)
}
