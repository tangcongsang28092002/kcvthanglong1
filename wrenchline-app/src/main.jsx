import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason
    const message = String(reason?.message || reason || '')
    if (reason?.name === 'AbortError' && message.includes('play() request')) {
      event.preventDefault()
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
