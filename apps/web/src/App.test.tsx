import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

const pages = [
  { label: 'Home', href: '/', heading: /^(Still up|Good (morning|afternoon|evening))$/ },
  { label: 'Board', href: '/board', heading: 'Board' },
  { label: 'Scout', href: '/scout', heading: 'Scout' },
  { label: 'Workflows', href: '/workflows', heading: 'Workflows' },
  { label: 'Chat', href: '/chat', text: 'Start a conversation.' },
  { label: 'Scheduled', href: '/schedules', heading: 'Scheduled tasks' },
  { label: 'Hermes', href: '/hermes', heading: 'Hermes agent' },
  { label: 'Files & projects', href: '/files', heading: 'Files & projects' },
  { label: 'Connections', href: '/connections', heading: 'Connections' },
]

afterEach(() => {
  cleanup()
})

function renderApp() {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  it('renders the shell and lists every page in the nav', () => {
    renderApp()

    expect(screen.getByText('JunOS')).toBeTruthy()

    const nav = screen.getByRole('navigation')
    for (const page of pages) {
      const link = within(nav).getByRole('link', { name: new RegExp(page.label) })
      expect(link.getAttribute('href')).toBe(page.href)
    }
  })

  it('shows each page when its nav link is used', () => {
    renderApp()

    const nav = screen.getByRole('navigation')
    for (const page of pages) {
      fireEvent.click(within(nav).getByRole('link', { name: new RegExp(page.label) }))
      const visible = 'heading' in page
        ? screen.getByRole('heading', { level: 1, name: page.heading })
        : screen.getByText(page.text)
      expect(visible).toBeTruthy()
    }
  })
})
