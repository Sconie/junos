import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HermesMemoryItem, HermesSkill } from '@junos/shared'
import { ShimError } from './protocol.ts'

const MAX_FILES = 50
const MAX_FILE_BYTES = 256 * 1024
const MAX_ITEM = 500
const MAX_OWN_ITEMS = 200
/** The one memory file JunOS writes. Hermes's own files are only ever read. */
export const OWN_NOTES = 'junos-notes.md'

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T
  } catch {
    return fallback
  }
}

function writeAtomic(path: string, text: string): void {
  const tmp = `${path}.${process.pid}.tmp`
  writeFileSync(tmp, text, { mode: 0o600 })
  renameSync(tmp, path)
}

const idFor = (file: string, text: string) => `m-${createHash('sha1').update(file).update('\0').update(text).digest('hex').slice(0, 12)}`

/**
 * Hermes's memory is plain files in a folder. A bullet line (`- ` or `* `) in a .md or .txt file is one remembered fact.
 * JunOS reads all of them, lets you pin them (a pin is kept in the shim's own state), and adds or edits only the facts in
 * junos-notes.md. A fact Hermes wrote is changed by telling Hermes, never by editing its files behind its back.
 */
export class MemoryStore {
  readonly #dir: string
  readonly #pins: string

  constructor(dir: string, stateDir: string) {
    this.#dir = dir
    this.#pins = join(stateDir, 'pins.json')
  }

  #scan(): Array<HermesMemoryItem & { file: string }> {
    if (!existsSync(this.#dir)) return []
    const out: Array<HermesMemoryItem & { file: string }> = []
    const pinned = new Set(readJson<string[]>(this.#pins, []))
    const files = readdirSync(this.#dir)
      .filter((f) => /\.(md|txt)$/i.test(f))
      .sort()
      .slice(0, MAX_FILES)
    for (const file of files) {
      const path = join(this.#dir, file)
      let st
      try {
        st = lstatSync(path)
      } catch {
        continue
      }
      // A link could point outside the memory folder, and a huge file would only slow every refresh.
      if (!st.isFile() || st.size > MAX_FILE_BYTES) continue
      for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
        const m = /^\s*[-*]\s+(.+?)\s*$/.exec(raw)
        if (!m) continue
        const text = m[1]!.slice(0, MAX_ITEM)
        const id = idFor(file, text)
        out.push({ id, text, pinned: pinned.has(id), file })
      }
    }
    return out
  }

  list(): HermesMemoryItem[] {
    return this.#scan().map(({ id, text, pinned }) => ({ id, text, pinned }))
  }

  /** Applies the edited list. Changes to Hermes's own facts other than pinning are refused. */
  set(items: HermesMemoryItem[]): HermesMemoryItem[] {
    const current = this.#scan()
    const byId = new Map(current.map((c) => [c.id, c]))
    const incoming = new Map<string, HermesMemoryItem>()
    const own: string[] = []
    for (const item of items) {
      const text = String(item.text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_ITEM)
      if (!text) throw new ShimError(400, 'bad_request', 'A memory item cannot be empty.')
      const known = typeof item.id === 'string' ? byId.get(item.id) : undefined
      if (known) {
        incoming.set(known.id, { id: known.id, text, pinned: item.pinned === true })
        if (known.file === OWN_NOTES) own.push(text)
        else if (text !== known.text) throw new ShimError(400, 'bad_request', 'Hermes wrote this memory. Ask Hermes to change it; JunOS can pin it but not edit it.')
      } else {
        own.push(text)
        incoming.set(idFor(OWN_NOTES, text), { id: idFor(OWN_NOTES, text), text, pinned: item.pinned === true })
      }
    }
    for (const c of current) {
      if (c.file !== OWN_NOTES && !incoming.has(c.id)) throw new ShimError(400, 'bad_request', 'Hermes wrote a memory that is not in your list. JunOS cannot remove it; ask Hermes to.')
    }
    if (own.length > MAX_OWN_ITEMS) throw new ShimError(400, 'bad_request', `JunOS keeps at most ${MAX_OWN_ITEMS} notes of its own.`)
    mkdirSync(this.#dir, { recursive: true })
    writeAtomic(join(this.#dir, OWN_NOTES), `# Notes from JunOS\n\n${own.map((t) => `- ${t}`).join('\n')}${own.length ? '\n' : ''}`)
    const pins = [...incoming.values()].filter((i) => i.pinned).map((i) => i.id)
    mkdirSync(join(this.#pins, '..'), { recursive: true, mode: 0o700 })
    writeAtomic(this.#pins, JSON.stringify(pins))
    return this.list()
  }
}

/**
 * Skills are folders under the skills directory that hold a SKILL.md (one level of category folders is allowed).
 * Hermes keeps no on/off switch the shim can reach, so a switch here is kept in the shim's state and passed to Hermes as a
 * line in every directive ("do not use these skills"). That is a request Hermes follows, not a lock.
 */
export class SkillStore {
  readonly #dir: string
  readonly #state: string

  constructor(dir: string, stateDir: string) {
    this.#dir = dir
    this.#state = join(stateDir, 'skills.json')
  }

  #scan(): Array<{ id: string; name: string; description: string }> {
    if (!existsSync(this.#dir)) return []
    const out: Array<{ id: string; name: string; description: string }> = []
    const visit = (rel: string, depth: number) => {
      const path = join(this.#dir, rel)
      let names: string[]
      try {
        names = readdirSync(path)
      } catch {
        return
      }
      for (const name of names.sort()) {
        if (!/^[\w.-]{1,80}$/.test(name) || name.startsWith('.')) continue
        const childRel = rel ? `${rel}/${name}` : name
        let st
        try {
          st = lstatSync(join(this.#dir, childRel))
        } catch {
          continue
        }
        if (!st.isDirectory()) continue
        const md = join(this.#dir, childRel, 'SKILL.md')
        if (existsSync(md) && lstatSync(md).isFile() && lstatSync(md).size <= MAX_FILE_BYTES) {
          const head = readFileSync(md, 'utf8').slice(0, 4000)
          const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(head)?.[1] ?? ''
          const pick = (k: string) => new RegExp(`^${k}:\\s*(.+)$`, 'mi').exec(fm)?.[1]?.trim().replace(/^["']|["']$/g, '')
          out.push({ id: childRel, name: (pick('name') ?? name).slice(0, 80), description: (pick('description') ?? '').slice(0, 300) })
        } else if (depth === 0) visit(childRel, 1)
        if (out.length >= 300) return
      }
    }
    visit('', 0)
    return out
  }

  #off(): Set<string> {
    return new Set(readJson<string[]>(this.#state, []))
  }

  list(): HermesSkill[] {
    const off = this.#off()
    return this.#scan().map((s) => ({ ...s, enabled: !off.has(s.id) }))
  }

  set(toggles: Array<{ id: string; enabled: boolean }>): HermesSkill[] {
    const known = new Set(this.#scan().map((s) => s.id))
    const off = this.#off()
    for (const t of toggles) {
      if (!known.has(t.id)) throw new ShimError(400, 'bad_request', `Unknown skill: ${String(t.id).slice(0, 80)}`)
      if (t.enabled) off.delete(t.id)
      else off.add(t.id)
    }
    mkdirSync(join(this.#state, '..'), { recursive: true, mode: 0o700 })
    writeAtomic(this.#state, JSON.stringify([...off]))
    return this.list()
  }

  /** Names of the skills switched off, for the line added to each directive. */
  disabled(): string[] {
    const off = this.#off()
    return this.#scan().filter((s) => off.has(s.id)).map((s) => s.name)
  }
}
