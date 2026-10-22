import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { DaemonProvider } from './lib/daemon.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DaemonProvider>
        <App />
      </DaemonProvider>
    </BrowserRouter>
  </StrictMode>,
)
