import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './pwa'

const storedTheme = localStorage.getItem('theme_preference')
const initialTheme = storedTheme === 'dark' ? 'dark' : 'light'
document.documentElement.setAttribute('data-theme', initialTheme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
