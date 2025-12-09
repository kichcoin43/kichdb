import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Index from './pages/Index'
import DataBrowser from './pages/DataBrowser'

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/data-browser" element={<DataBrowser />} />
      </Routes>
    </BrowserRouter>
  )
}
