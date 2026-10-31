import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/bowlby-one/400.css'
import '@fontsource/permanent-marker/400.css'
import '@fontsource/press-start-2p/400.css'
import '@fontsource-variable/bricolage-grotesque/index.css'
import './styles/tokens.css'
import './styles/global.css'
import './components/ui/ui.css'
import './components/chrome/chrome.css'
import { installAudioUnlock } from './audio/engine'
import App from './App'

installAudioUnlock()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
