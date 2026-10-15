import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installSoundUnlock } from './app/sound'
import { installTheme } from './app/theme'
import { installLang } from './i18n'

installSoundUnlock()
installTheme()
installLang()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
