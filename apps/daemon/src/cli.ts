import { existsSync, readFileSync } from 'node:fs'
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
 * The Node script an npm-generated `.cmd` shim runs, or null. npm writes a line like
 * `"%dp0%\node_modules\@scope\pkg\cli.js" %*`; running that script with node ourselves avoids cmd.exe,
 * which cannot take arbitrary arguments safely.
 */
export function scriptFromNpmShim(shimText: string, shimDir: string): string | null {
  const match = /"%dp0%\\([^"]+?\.(?:c|m)?js)"/i.exec(shimText)
  if (!match) return null
  const script = join(shimDir, ...match[1]!.split('\\'))
  return existsSync(script) ? script : null
}

/**
 * How to start a CLI by name or path. A .mjs/.js/.ts file is run through node (the test fakes);
 * a bare name is searched on PATH. On Windows a real .exe is preferred, and an npm `.cmd` shim is
 * followed to the Node script behind it, because a shim itself cannot be launched with safe arguments.
 */
export function resolveLauncher(bin: string, env: NodeJS.ProcessEnv): Launch | null {
  if (/\.(mjs|cjs|js|ts)$/.test(bin)) return existsSync(bin) ? { command: process.execPath, prefix: [bin] } : null
  if (isAbsolute(bin)) return existsSync(bin) ? { command: bin, prefix: [] } : null
  const dirs = (env.PATH ?? env.Path ?? '').split(delimiter).filter(Boolean)
  const exts = process.platform === 'win32' ? ['.exe', '.com', '.cmd'] : ['']
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = join(dir, bin + ext)
      if (!existsSync(candidate)) continue
      if (ext === '.cmd') {
        let script: string | null = null
        try {
          script = scriptFromNpmShim(readFileSync(candidate, 'utf8'), dir)
        } catch {
          /* unreadable shim */
        }
        if (script) return { command: process.execPath, prefix: [script] }
        continue // a shim we cannot follow is not launchable
      }
      return { command: candidate, prefix: [] }
    }
  }
  return null
}
