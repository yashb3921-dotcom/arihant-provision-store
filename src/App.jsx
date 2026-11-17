import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { useAuth } from './context'
import Layout from './components/Layout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Login from './pages/Login'
import Account from './pages/Account'
const Admin = lazy(() => import('./pages/admin/Admin'))
const Delivery = lazy(() => import('./pages/Delivery'))

function Guard({ roles, children }) {
  const { user, role, loading } = useAuth()
  if (loading) return <div className="p-10 text-center text-ink/60">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(role)) return <Navigate to="/" replace />
  return children
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Suspense fallback={<div className="p-10 text-center text-ink/60">Loading...</div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Guard><Checkout /></Guard>} />
          <Route path="/login" element={<Login />} />
          <Route path="/account/*" element={<Guard><Account /></Guard>} />
          <Route path="/delivery" element={<Guard roles={['delivery', 'admin']}><Delivery /></Guard>} />
        </Route>
        <Route path="/admin/*" element={<Guard roles={['admin']}><Admin /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  )
}
