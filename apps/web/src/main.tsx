import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthGate } from './lib/auth.tsx'
import { DaemonProvider } from './lib/daemon.tsx'
import Pair from './pages/Pair.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthGate pairing={<Pair />}>
        <DaemonProvider>
          <App />
        </DaemonProvider>
      </AuthGate>
    </BrowserRouter>
  </StrictMode>,
)
