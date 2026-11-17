import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { LangProvider, AuthProvider, SettingsProvider, CatalogProvider, CartProvider } from './context'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangProvider>
        <SettingsProvider>
          <AuthProvider>
            <CatalogProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </CatalogProvider>
          </AuthProvider>
        </SettingsProvider>
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>
)
