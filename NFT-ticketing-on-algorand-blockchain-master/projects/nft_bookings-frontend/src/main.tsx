import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/App.css'
import ErrorBoundary from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div className="text-center mt-20 text-xl">Loading...</div>}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
)
