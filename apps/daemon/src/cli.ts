import { existsSync } from 'node:fs'
import { delimiter, isAbsolute, join } from 'node:path'

/**
 * The environment a provider CLI gets: the few variables it needs to find its own login and run,
 * and nothing else from the daemon's environment (spec 12: no secrets beyond what the project allows).
 */
const ENV_ALLOW = [
  'PATH', 'PATHEXT', 'SystemRoot', 'windir', 'ComSpec', 'TEMP', 'TMP', 'TMPDIR',
  'USERPROFILE', 'HOME', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'USERNAME', 'USER',
  'LANG', 'LC_ALL', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME',
  // Where each CLI keeps its sign-in, when the user moved it.
  'CLAUDE_CONFIG_DIR', 'CODEX_HOME',
]

export function cliEnv(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = {}
  for (const key of Object.keys(base)) {
    // Test-only knobs for the fake CLIs; never present in a normal environment.
    if (ENV_ALLOW.includes(key) || key.startsWith('JUNOS_FAKE_')) out[key] = base[key]
  }
  return out
}

export interface Launch {
  command: string
  /** Arguments that come before the caller's own (the script path, for a script). */
  prefix: string[]
}

/**
 * How to start a CLI by name or path. A .mjs/.js/.ts file is run through node (the test fakes);
 * a bare name is searched on PATH, preferring real executables because a .cmd shim needs a shell.
 */
export function resolveLauncher(bin: string, env: NodeJS.ProcessEnv): Launch | null {
  if (/\.(mjs|cjs|js|ts)$/.test(bin)) return existsSync(bin) ? { command: process.execPath, prefix: [bin] } : null
  if (isAbsolute(bin)) return existsSync(bin) ? { command: bin, prefix: [] } : null
  const dirs = (env.PATH ?? env.Path ?? '').split(delimiter).filter(Boolean)
  const exts = process.platform === 'win32' ? ['.exe', '.com'] : ['']
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = join(dir, bin + ext)
      if (existsSync(candidate)) return { command: candidate, prefix: [] }
    }
  }
  return null
}
