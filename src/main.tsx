import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import './index.css'
import { router } from './router'
import { RevenueProvider } from './context/RevenueContext'
import { BankProvider } from './context/BankContext'
import { AccountingProvider } from './context/AccountingContext'

function App() {
  return (
    <RevenueProvider>
      <BankProvider>
        <AccountingProvider>
          <RouterProvider router={router} />
        </AccountingProvider>
      </BankProvider>
    </RevenueProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
