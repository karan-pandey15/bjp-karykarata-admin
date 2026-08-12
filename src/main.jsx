import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'
import { ConfirmProvider } from './context/ConfirmContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfirmProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            style: { background: '#16a34a', color: '#fff' },
          },
          error: {
            style: { background: '#dc2626', color: '#fff' },
          },
        }}
      />
    </ConfirmProvider>
  </StrictMode>,
)
