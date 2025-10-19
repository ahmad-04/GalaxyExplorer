import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import DrawwitStyle from '../drawwit_font.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DrawwitStyle/>
    <App />
  </StrictMode>,
)
