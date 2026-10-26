import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

const pages = [
  { label: 'Home', href: '/', heading: /^(Still up|Good (morning|afternoon|evening))$/ },
  { label: 'Board', href: '/board', heading: 'Board' },
  { label: 'Scout', href: '/scout', heading: 'Scout' },
  { label: 'Workflows', href: '/workflows', heading: 'Workflows' },
  { label: 'Backups', href: '/backups', heading: 'Backups' },
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

  describe('on a phone', () => {
    it('keeps four screens in the bar, and opens the rest from More', () => {
      renderApp()
      const more = screen.getByRole('button', { name: /More/  })
      expect(more.getAttribute('aria-expanded')).toBe('false')
      const nav = screen.getByRole('navigation')
      // The bar and the sheet are the same links: the four used most are plain, the others are marked for the sheet.
      for (const label of ['Home', 'Inbox', 'Chat', 'Board']) expect(within(nav).getByRole('link', { name: new RegExp(label) }).className).not.toContain('nav-secondary')
      for (const label of ['Scout', 'Terminal', 'Backups', 'Connections']) expect(within(nav).getByRole('link', { name: new RegExp(label) }).className).toContain('nav-secondary')
      fireEvent.click(more)
      const close = screen.getByRole('button', { name: /Close/  })
      expect(close.getAttribute('aria-expanded')).toBe('true')
      expect(document.querySelector('.sidebar')!.getAttribute('data-more')).toBe('true')
    })

    it('closes the sheet when a screen is chosen or Escape is pressed', () => {
      renderApp()
      fireEvent.click(screen.getByRole('button', { name: /More/  }))
      fireEvent.click(within(screen.getByRole('navigation')).getByRole('link', { name: /Scout/ }))
      expect(screen.getByRole('button', { name: /More/  }).getAttribute('aria-expanded')).toBe('false')
      expect(screen.getByRole('heading', { level: 1, name: 'Scout' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: /More/  }))
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(screen.getByRole('button', { name: /More/  }).getAttribute('aria-expanded')).toBe('false')
    })
  })
})
