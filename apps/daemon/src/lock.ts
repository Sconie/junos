import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface LockInfo {
  pid: number
  port: number | null
}

export class AlreadyRunningError extends Error {
  readonly info: LockInfo
  constructor(info: LockInfo) {
    super(`junosd is already running (pid ${info.pid})`)
    this.info = info
  }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

function read(path: string): LockInfo | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as LockInfo
  } catch {
    return null
  }
}

/**
 * Single-instance lock file in the data dir. A lock left behind by a crashed
 * or force-killed daemon (its pid is gone) is taken over.
 */
export function acquireLock(dir: string) {
  const path = join(dir, 'junosd.lock')
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      writeFileSync(path, JSON.stringify({ pid: process.pid, port: null } satisfies LockInfo), { flag: 'wx' })
      break
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
      const info = read(path)
      if (info && info.pid !== process.pid && alive(info.pid)) throw new AlreadyRunningError(info)
      rmSync(path, { force: true }) // stale
      if (attempt === 1) throw err
    }
  }
  return {
    path,
    setPort(port: number) {
      writeFileSync(path, JSON.stringify({ pid: process.pid, port } satisfies LockInfo))
    },
    release() {
      if (read(path)?.pid === process.pid) rmSync(path, { force: true })
    },
  }
}
