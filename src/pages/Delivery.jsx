import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth, useLang } from '../context'
import { mapsLink, money, telLink, toDate } from '../lib/utils'

export default function Delivery() {
  const { t } = useLang()
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [tab, setTab] = useState('active')

  useEffect(() => onSnapshot(query(collection(db, 'orders'), where('assignedTo', '==', user.uid)),
    (s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {}), [user.uid])

  const active = useMemo(() => orders.filter((o) => !['delivered', 'cancelled'].includes(o.status))
    .sort((a, b) => (toDate(a.createdAt) || 0) - (toDate(b.createdAt) || 0)), [orders])
  const done = useMemo(() => orders.filter((o) => o.status === 'delivered')
    .sort((a, b) => (toDate(b.updatedAt) || 0) - (toDate(a.updatedAt) || 0)), [orders])
  const today = done.filter((o) => toDate(o.updatedAt)?.toDateString() === new Date().toDateString())
  const cashToday = today.filter((o) => o.cashCollected).reduce((s, o) => s + o.total, 0)

  const start = (o) => updateDoc(doc(db, 'orders', o.id), { status: 'out_for_delivery', updatedAt: serverTimestamp() })
  const finish = (o) => updateDoc(doc(db, 'orders', o.id), { status: 'delivered', cashCollected: true, updatedAt: serverTimestamp() })
  const list = tab === 'active' ? active : done

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <div className="card"><p className="text-2xl font-extrabold">{active.length}</p><p className="text-xs text-ink/60">{t('myDeliveries')}</p></div>
        <div className="card"><p className="text-2xl font-extrabold">{today.length}</p><p className="text-xs text-ink/60">{t('history')}</p></div>
        <div className="card"><p className="text-2xl font-extrabold">{money(cashToday)}</p><p className="text-xs text-ink/60">Cash today</p></div>
      </div>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab('active')} className={tab === 'active' ? 'btn-green btn-sm' : 'btn-line btn-sm'}>{t('myDeliveries')}</button>
        <button onClick={() => setTab('done')} className={tab === 'done' ? 'btn-green btn-sm' : 'btn-line btn-sm'}>{t('history')}</button>
      </div>

      {list.length === 0 && <p className="py-10 text-center text-ink/60">{t('noDeliveries')}</p>}
      <div className="space-y-4">
        {list.map((o) => (
          <div key={o.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold">#{o.orderNo}</p>
              <span className="badge bg-cream-deep">{t('status_' + o.status)}</span>
            </div>
            <div>
              <p className="font-semibold">{o.customer.name}</p>
              <p className="text-sm text-ink/80">{o.address.text}</p>
              <p className="text-sm text-ink/60">{o.distanceKm} {t('km')}</p>
            </div>
            <p className="text-sm">{o.items.map((i) => `${i.qty} × ${i.name} (${i.unit})`).join(', ')}</p>
            <p className="rounded-lg bg-amber/20 p-2.5 text-lg font-extrabold">{t('collect')}: {money(o.total)}</p>
            <div className="grid grid-cols-2 gap-2">
              <a href={telLink(o.customer.phone)} className="btn-line">📞 {t('call')}</a>
              <a href={mapsLink(o.address)} target="_blank" rel="noreferrer" className="btn-line">🗺️ {t('openMaps')}</a>
            </div>
            {tab === 'active' && (o.status === 'out_for_delivery'
              ? <button onClick={() => finish(o)} className="btn-green w-full py-3">{t('markDelivered')}</button>
              : <button onClick={() => start(o)} className="btn-amber w-full py-3">{t('startDelivery')}</button>)}
          </div>
        ))}
      </div>
    </div>
  )
}
