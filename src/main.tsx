import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import './index.css'
import { router } from './router'
import { RevenueProvider } from './context/RevenueContext'

function App() {
  return (
    <RevenueProvider>
      <RouterProvider router={router} />
    </RevenueProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
