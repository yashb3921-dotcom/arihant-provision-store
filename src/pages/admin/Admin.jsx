import { useEffect, useMemo, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth, useCatalog, useSettings } from '../../context'
import { money, toDate } from '../../lib/utils'
import AdminOrders from './AdminOrders'
import { AdminProducts, AdminCategories, seedSampleData } from './AdminCatalog'

/* ---------- shared: live orders (latest 300) ---------- */
export function useOrders() {
  const [orders, setOrders] = useState([])
  useEffect(() => onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(300)),
    (s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))), (e) => console.error(e)), [])
  return orders
}

/* ---------- Overview ---------- */
function Overview() {
  const orders = useOrders()
  const { products, categories, ready } = useCatalog()
  const [seeding, setSeeding] = useState(false)
  const stats = useMemo(() => {
    const day = (d) => d.toDateString()
    const today = new Date().toDateString()
    const valid = orders.filter((o) => o.status !== 'cancelled')
    const todays = valid.filter((o) => toDate(o.createdAt) && day(toDate(o.createdAt)) === today)
    const week = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const sum = valid.filter((o) => toDate(o.createdAt) && day(toDate(o.createdAt)) === d.toDateString()).reduce((s, o) => s + o.total, 0)
      return { label: d.toLocaleDateString('en-IN', { weekday: 'short' }), sum }
    })
    const top = {}
    valid.forEach((o) => o.items.forEach((i) => { top[i.name] = (top[i.name] || 0) + i.qty }))
    return {
      newCount: orders.filter((o) => o.status === 'placed').length,
      out: orders.filter((o) => o.status === 'out_for_delivery').length,
      todayCount: todays.length,
      todaySales: todays.reduce((s, o) => s + o.total, 0),
      week, top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 6),
    }
  }, [orders])
  const low = products.filter((p) => p.active !== false && Number(p.stock) <= 5)
  const max = Math.max(1, ...stats.week.map((w) => w.sum))
  const card = (label, val, tone = '') => <div className={`card ${tone}`}><p className="text-sm text-ink/60">{label}</p><p className="text-2xl font-extrabold">{val}</p></div>

  return (
    <div className="space-y-6">
      {ready && products.length === 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 bg-amber/20">
          <p><b>Your shop is empty.</b> Add 4 categories and about 17 sample products so you can see how the site looks. You can edit or delete them later.</p>
          <button disabled={seeding} className="btn-green" onClick={async () => { setSeeding(true); await seedSampleData(); setSeeding(false) }}>
            {seeding ? 'Adding...' : 'Add sample products'}
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {card('New orders waiting', stats.newCount, stats.newCount ? 'ring-2 ring-amber' : '')}
        {card('Out for delivery', stats.out)}
        {card("Today's orders", stats.todayCount)}
        {card("Today's sales", money(stats.todaySales))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-bold">Sales, last 7 days</h3>
          <div className="flex h-40 items-end gap-2">
            {stats.week.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] text-ink/60">{w.sum ? Math.round(w.sum) : ''}</span>
                <div className="w-full rounded-t bg-leaf" style={{ height: `${(w.sum / max) * 100}%`, minHeight: w.sum ? 4 : 0 }} />
                <span className="text-xs text-ink/60">{w.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="mb-3 font-bold">Best sellers</h3>
          {stats.top.length === 0 ? <p className="text-sm text-ink/60">No orders yet.</p>
            : stats.top.map(([n, q]) => <div key={n} className="flex justify-between border-b border-cream-line py-1.5 text-sm last:border-0"><span>{n}</span><b>{q}</b></div>)}
        </div>
      </div>
      <div className="card">
        <h3 className="mb-3 font-bold">Low stock (5 or less)</h3>
        {low.length === 0 ? <p className="text-sm text-ink/60">All items have enough stock.</p>
          : <div className="flex flex-wrap gap-2">{low.map((p) => <span key={p.id} className="badge bg-red-50 text-red-700">{p.name}: {p.stock}</span>)}</div>}
        <p className="mt-3 text-xs text-ink/50">{categories.length} categories · {products.length} products</p>
      </div>
    </div>
  )
}

/* ---------- Users and staff ---------- */
function Users() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [q, setQ] = useState('')
  useEffect(() => onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {}), [])
  const staff = users.filter((u) => u.role === 'delivery').length
  const shown = users.filter((u) => `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0))
  const setRole = (u, role) => {
    if (u.id === user.uid && role !== 'admin' && !confirm('You are changing your own role. You will lose admin access. Continue?')) return
    updateDoc(doc(db, 'users', u.id), { role })
  }
  return (
    <div className="space-y-4">
      <div className="card text-sm">
        <p><b>Delivery staff: {staff}</b></p>
        <p className="text-ink/70">To add a delivery person, ask them to create an account on the website. Then find them here and set their role to <b>delivery</b>.</p>
      </div>
      <input className="input max-w-sm" placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream-deep"><tr><th className="p-3">Name</th><th className="p-3">Phone</th><th className="hidden p-3 sm:table-cell">Email</th><th className="p-3">Role</th></tr></thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id} className="border-t border-cream-line">
                <td className="p-3 font-medium">{u.name || '-'}</td><td className="p-3">{u.phone || '-'}</td><td className="hidden p-3 sm:table-cell">{u.email}</td>
                <td className="p-3">
                  <select className="input !w-auto !py-1.5" value={u.role} onChange={(e) => setRole(u, e.target.value)}>
                    <option value="customer">customer</option><option value="delivery">delivery</option><option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------- Settings ---------- */
function Settings() {
  const s = useSettings()
  const [f, setF] = useState(s)
  const [done, setDone] = useState(false)
  useEffect(() => setF(s), [s])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'number' ? e.target.value : e.target.value })
  const num = (v) => Number(v) || 0
  const save = async (e) => {
    e.preventDefault()
    await setDoc(doc(db, 'settings', 'store'), {
      shopName: f.shopName, phone: String(f.phone), whatsapp: String(f.whatsapp), address: f.address, hours: f.hours,
      shopLat: num(f.shopLat), shopLng: num(f.shopLng), ratePerKm: num(f.ratePerKm), freeAbove: num(f.freeAbove),
      maxKm: num(f.maxKm), minOrder: num(f.minOrder), isOpen: !!f.isOpen, updatedAt: serverTimestamp(),
    }, { merge: true })
    setDone(true); setTimeout(() => setDone(false), 2000)
  }
  const here = () => navigator.geolocation?.getCurrentPosition((p) => setF({ ...f, shopLat: p.coords.latitude, shopLng: p.coords.longitude }))
  const field = (k, label, type = 'text', hint) => (
    <div><label className="label">{label}</label><input type={type} step="any" className="input" value={f[k] ?? ''} onChange={set(k)} />{hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}</div>
  )
  return (
    <form onSubmit={save} className="max-w-2xl space-y-6">
      <div className="card space-y-3">
        <h3 className="font-bold">Delivery rules</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {field('ratePerKm', 'Charge per km (₹)', 'number')}
          {field('freeAbove', 'Free delivery for orders of (₹) or more', 'number')}
          {field('maxKm', 'Maximum delivery distance (km)', 'number')}
          {field('minOrder', 'Minimum order (₹)', 'number', '0 means no minimum')}
        </div>
        <label className="flex items-center gap-2 font-medium"><input type="checkbox" checked={!!f.isOpen} onChange={(e) => setF({ ...f, isOpen: e.target.checked })} /> Shop is open for orders</label>
      </div>
      <div className="card space-y-3">
        <h3 className="font-bold">Shop details</h3>
        {field('shopName', 'Shop name')}
        <div className="grid gap-3 sm:grid-cols-2">{field('phone', 'Phone')}{field('whatsapp', 'WhatsApp number')}</div>
        {field('address', 'Address')}
        {field('hours', 'Opening hours')}
        <div className="grid gap-3 sm:grid-cols-2">{field('shopLat', 'Shop latitude', 'number')}{field('shopLng', 'Shop longitude', 'number')}</div>
        <button type="button" onClick={here} className="btn-line btn-sm">Use my current location as the shop location</button>
      </div>
      <button className="btn-green">{done ? 'Saved' : 'Save settings'}</button>
    </form>
  )
}

/* ---------- Shell ---------- */
export default function Admin() {
  const orders = useOrders()
  const s = useSettings()
  const { logout } = useAuth()
  const newCount = orders.filter((o) => o.status === 'placed').length
  // One-tap switch to stop / resume accepting orders from the website
  const toggleOrders = () => setDoc(doc(db, 'settings', 'store'), { isOpen: !s.isOpen, updatedAt: serverTimestamp() }, { merge: true })
    .catch((e) => alert('Could not change: ' + e.message))
  const tab = ({ isActive }) => `whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium ${isActive ? 'bg-forest text-white' : 'hover:bg-cream-deep'}`
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-cream-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-full" />
          <p className="font-extrabold">Admin</p>
          <button onClick={toggleOrders} className={`ml-auto rounded-lg px-3 py-1.5 text-left text-white ${s.isOpen ? 'bg-leaf' : 'bg-red-600'}`}>
            <span className="block text-sm font-bold leading-tight">{s.isOpen ? 'Accepting orders' : 'Orders paused'}</span>
            <span className="block text-[11px] leading-tight opacity-90">{s.isOpen ? 'Tap to pause' : 'Tap to resume'}</span>
          </button>
          <button onClick={logout} className="btn-line btn-sm">Logout</button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2 sm:px-4">
          <NavLink end to="/admin" className={tab}>Overview</NavLink>
          <NavLink to="/admin/orders" className={tab}>Orders{newCount > 0 && <span className="badge ml-1.5 bg-amber text-ink">{newCount}</span>}</NavLink>
          <NavLink to="/admin/products" className={tab}>Products</NavLink>
          <NavLink to="/admin/categories" className={tab}>Categories</NavLink>
          <NavLink to="/admin/users" className={tab}>Users &amp; staff</NavLink>
          <NavLink to="/admin/settings" className={tab}>Settings</NavLink>
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="orders" element={<AdminOrders orders={orders} />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  )
}
