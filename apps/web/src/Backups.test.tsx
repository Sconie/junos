import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BackupRecord, BackupsResponse } from '@junos/shared'
import Backups from './pages/Backups'

const rec = (over: Partial<BackupRecord> = {}): BackupRecord => ({ id: 'b1', startedAt: '2026-10-23T03:00:00.000Z', finishedAt: '2026-10-23T03:00:02.000Z', status: 'ok', trigger: 'schedule', file: 'junos-20261023T030000Z.db', size: 3_145_728, verified: true, present: true, error: null, ...over })

const data = (over: Partial<BackupsResponse> = {}): BackupsResponse => ({ dir: 'C:\\Users\\Jonas\\.junos\\backups', keep: 14, hour: 3, running: false, nextDue: '2026-10-24T03:00:00.000Z', overdue: false, backups: [rec()], ...over })

function mockDaemon(reply: BackupsResponse = data(), run: () => Response = () => new Response(JSON.stringify(rec({ id: 'b2', trigger: 'manual' })), { status: 200 })) {
  const calls: Array<{ path: string; method: string }> = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const path = String(input).replace(/^\/api/, '')
      const method = init.method ?? 'GET'
      calls.push({ path, method })
      if (path === '/backups') return new Response(JSON.stringify(reply), { status: 200 })
      if (path === '/backups/run') return run()
      return new Response('{}', { status: 404 })
    }),
  )
  return calls
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Backups', () => {
  it('shows the last good backup, when the next is due, and each backup with its size and result', async () => {
    mockDaemon(data({ backups: [rec(), rec({ id: 'b0', startedAt: '2026-10-22T03:00:00.000Z', file: 'junos-20261022T030000Z.db', present: false, size: 3_000_000 }), rec({ id: 'bf', status: 'failed', file: null, size: null, verified: false, present: false, error: 'Disk is full' })] }))
    render(<Backups />)
    const table = await screen.findByRole('table')
    expect(within(table).getByText('Verified')).toBeTruthy()
    expect(within(table).getByText('Verified, since deleted')).toBeTruthy()
    expect(within(table).getByText('Failed: Disk is full')).toBeTruthy()
    expect(within(table).getByText('junos-20261023T030000Z.db')).toBeTruthy()
    expect(within(table).getByText('3.0 MB')).toBeTruthy()
    expect(screen.getByLabelText('Status').textContent).toMatch(/Last good backup .*\. Next: /)
    expect(screen.getByText(/after 03:00/)).toBeTruthy()
    expect(screen.getByText(/The newest 14 good ones are kept in/)).toBeTruthy()
  })

  it('warns when the latest attempt failed, and says which good one is still there', async () => {
    mockDaemon(data({ backups: [rec({ id: 'bf', status: 'failed', file: null, size: null, verified: false, present: false, error: 'The copy did not pass its check' }), rec()] }))
    render(<Backups />)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/The last attempt failed \(The copy did not pass its check\)\. The last good backup is from /)
  })

  it('says there is no good backup yet, and that one is due', async () => {
    mockDaemon(data({ backups: [], overdue: true }))
    render(<Backups />)
    expect((await screen.findByLabelText('Status')).textContent).toBe('No good backup yet. Next: due now.')
    expect(screen.getByText(/No backups yet\./)).toBeTruthy()
  })

  it('backs up on request, and reports a failure', async () => {
    const calls = mockDaemon()
    render(<Backups />)
    fireEvent.click(await screen.findByRole('button', { name: 'Back up now' }))
    await waitFor(() => expect(calls.some((c) => c.path === '/backups/run' && c.method === 'POST')).toBe(true))
    await waitFor(() => expect(calls.filter((c) => c.path === '/backups').length).toBeGreaterThanOrEqual(2))
    cleanup()
    mockDaemon(data(), () => new Response(JSON.stringify(rec({ status: 'failed', error: 'Disk is full', file: null })), { status: 200 }))
    render(<Backups />)
    fireEvent.click(await screen.findByRole('button', { name: 'Back up now' }))
    expect((await screen.findByRole('alert')).textContent).toBe('The backup failed: Disk is full')
  })

  it('is switched off while a backup runs, and explains how to restore', async () => {
    mockDaemon(data({ running: true }))
    render(<Backups />)
    expect(((await screen.findByRole('button', { name: 'Backing up…' })) as HTMLButtonElement).disabled).toBe(true)
    const how = screen.getByText('How to restore').closest('details')!
    expect(within(how).getByText(/Stop junosd/)).toBeTruthy()
    expect(within(how).getByText(/npm run backup:verify/)).toBeTruthy()
    expect(within(how).getByText(/delete/, { exact: false })).toBeTruthy()
  })
})
