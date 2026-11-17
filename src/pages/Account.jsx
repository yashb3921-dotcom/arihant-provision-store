import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth, useCart, useLang } from '../context'
import { STATUSES } from '../config'
import { fmtDate, money, telLink, toDate } from '../lib/utils'

export function StatusTrack({ status }) {
  const { t } = useLang()
  if (status === 'cancelled') return <span className="badge bg-red-100 text-red-700">{t('status_cancelled')}</span>
  const at = STATUSES.indexOf(status)
  return (
    <ol className="flex items-center gap-1 overflow-x-auto py-1 text-xs">
      {STATUSES.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 font-medium ${i <= at ? 'bg-forest text-white' : 'bg-cream-deep text-ink/50'}`}>{t('status_' + s)}</span>
          {i < STATUSES.length - 1 && <span className={`h-0.5 w-3 ${i < at ? 'bg-forest' : 'bg-cream-line'}`} />}
        </li>
      ))}
    </ol>
  )
}

function Orders() {
  const { t } = useLang()
  const { user } = useAuth()
  const { addMany } = useCart()
  const nav = useNavigate()
  const loc = useLocation()
  const [orders, setOrders] = useState(null)

  useEffect(() => onSnapshot(query(collection(db, 'orders'), where('userId', '==', user.uid)), (s) => {
    setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (toDate(b.createdAt) || 0) - (toDate(a.createdAt) || 0)))
  }, () => setOrders([])), [user.uid])

  const cancel = (o) => updateDoc(doc(db, 'orders', o.id), { status: 'cancelled', updatedAt: serverTimestamp() })
  const again = (o) => { addMany(o.items.map((i) => ({ id: i.id, qty: i.kg ?? i.qty }))); nav('/cart') }

  return (
    <div className="space-y-4">
      {loc.state?.placed && (
        <div className="rounded-2xl bg-leaf/15 p-4 text-forest">
          <p className="font-bold">{t('orderDone')}</p><p className="text-sm">{t('orderDoneText')}</p>
        </div>
      )}
      {orders === null ? <p className="text-ink/60">Loading...</p>
        : orders.length === 0 ? <p className="text-ink/60">{t('noOrders')}</p>
        : orders.map((o) => (
          <div key={o.id} className="card space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">#{o.orderNo || o.id.slice(0, 6)}</p>
              <p className="text-sm text-ink/60">{fmtDate(o.createdAt)}</p>
            </div>
            <StatusTrack status={o.status} />
            <p className="text-sm text-ink/80">{o.items.map((i) => (i.loose ? `${i.name} (${i.unit})` : `${i.qty} × ${i.name}`)).join(', ')}</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{money(o.total)} <span className="text-sm font-normal text-ink/60">({t('cod')})</span></p>
              <div className="flex gap-2">
                {o.status === 'out_for_delivery' && o.assignedPhone && <a href={telLink(o.assignedPhone)} className="btn-amber btn-sm">{t('call')} {o.assignedName}</a>}
                {o.status === 'placed' && <button onClick={() => cancel(o)} className="btn-line btn-sm text-red-600">{t('cancel')}</button>}
                <button onClick={() => again(o)} className="btn-green btn-sm">{t('reorder')}</button>
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}

function Addresses() {
  const { t } = useLang()
  const { user, profile } = useAuth()
  const list = profile?.addresses || []
  const remove = (i) => updateDoc(doc(db, 'users', user.uid), { addresses: list.filter((_, x) => x !== i) })
  return (
    <div className="space-y-3">
      {list.length === 0 && <p className="text-ink/60">No saved addresses yet. Tick "{t('saveAddr')}" at checkout.</p>}
      {list.map((a, i) => (
        <div key={i} className="card flex items-start justify-between gap-3">
          <p className="text-sm">{a.text}</p>
          <button onClick={() => remove(i)} className="text-sm text-red-600">{t('remove')}</button>
        </div>
      ))}
    </div>
  )
}

function Profile() {
  const { t } = useLang()
  const { user, profile } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => { if (profile) { setName(profile.name || ''); setPhone(profile.phone || '') } }, [profile])
  const save = async (e) => {
    e.preventDefault()
    await updateDoc(doc(db, 'users', user.uid), { name, phone })
    setDone(true); setTimeout(() => setDone(false), 2000)
  }
  return (
    <form onSubmit={save} className="card max-w-md space-y-3">
      <div><label className="label">{t('yourName')}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><label className="label">{t('yourPhone')}</label><input className="input" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      <div><label className="label">{t('email')}</label><input className="input bg-cream-deep" disabled value={profile?.email || ''} /></div>
      <button className="btn-green">{done ? t('saved') : t('save')}</button>
    </form>
  )
}

export default function Account() {
  const { t } = useLang()
  const tab = ({ isActive }) => `whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium ${isActive ? 'bg-forest text-white' : 'bg-white ring-1 ring-cream-line'}`
  return (
    <div className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="mb-5 flex gap-2 overflow-x-auto">
        <NavLink end to="/account" className={tab}>{t('orders')}</NavLink>
        <NavLink to="/account/addresses" className={tab}>{t('addresses')}</NavLink>
        <NavLink to="/account/profile" className={tab}>{t('profile')}</NavLink>
      </div>
      <Routes>
        <Route index element={<Orders />} />
        <Route path="addresses" element={<Addresses />} />
        <Route path="profile" element={<Profile />} />
      </Routes>
    </div>
  )
}
