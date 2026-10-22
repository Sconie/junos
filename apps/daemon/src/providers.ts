import { execFile } from 'node:child_process'
import { PROVIDER_IDS, type ProviderId, type ProviderProbe } from '@junos/shared'

const DEFAULT_BIN: Partial<Record<ProviderId, string>> = {
  claude: 'claude',
  codex: 'codex',
  cursor: 'cursor-agent',
}

const NOT_PROBED: Partial<Record<ProviderId, string>> = {
  grok: 'coming: no supported route yet',
  nous: 'pending adapter spike',
}

function run(bin: string, args: string[]): Promise<string> {
  const script = /\.(mjs|cjs|js|ts)$/.test(bin)
  // Bare command names on Windows are .cmd shims, which only cmd.exe can launch.
  const [file, argv] = script
    ? [process.execPath, [bin, ...args]]
    : process.platform === 'win32'
      ? ['cmd.exe', ['/d', '/s', '/c', bin, ...args]]
      : [bin, args]
  return new Promise((resolve, reject) => {
    execFile(
      file,
      argv,
      { timeout: 5000, windowsHide: true },
      (err, stdout) => (err ? reject(err) : resolve(stdout.trim())),
    )
  })
}

/**
 * Asks each provider CLI for `--version`. Nothing is sent to a provider.
 * `JUNOS_<ID>_BIN` overrides the command (tests point these at fake CLIs).
 */
export async function probeProviders(env: NodeJS.ProcessEnv = process.env): Promise<ProviderProbe[]> {
  return Promise.all(
    PROVIDER_IDS.map(async (id): Promise<ProviderProbe> => {
      const note = NOT_PROBED[id]
      if (note) return { id, detected: false, error: note }
      const bin = env[`JUNOS_${id.toUpperCase()}_BIN`] || DEFAULT_BIN[id]!
      try {
        const out = await run(bin, ['--version'])
        return { id, detected: true, version: out.split(/\r?\n/)[0] }
      } catch (err) {
        return { id, detected: false, error: (err as NodeJS.ErrnoException).code ?? 'probe failed' }
      }
    }),
  )
}
