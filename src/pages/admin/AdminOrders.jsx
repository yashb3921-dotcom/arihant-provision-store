import { useEffect, useState } from 'react'
import { collection, doc, increment, onSnapshot, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import { STATUSES } from '../../config'
import { useSettings } from '../../context'
import { fmtDate, mapsLink, money, telLink, waLink } from '../../lib/utils'

const LABEL = { placed: 'New', confirmed: 'Confirmed', packed: 'Packed', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' }
const TONE = { placed: 'bg-amber text-ink', confirmed: 'bg-blue-100 text-blue-800', packed: 'bg-indigo-100 text-indigo-800', out_for_delivery: 'bg-purple-100 text-purple-800', delivered: 'bg-leaf/20 text-forest', cancelled: 'bg-red-100 text-red-700' }

function printBill(o, shop) {
  const rows = o.items.map((i) => `<tr><td>${i.name} (${i.unit})</td><td align="center">${i.qty}</td><td align="right">${i.price}</td><td align="right">${i.price * i.qty}</td></tr>`).join('')
  const w = window.open('', '_blank', 'width=420,height=640')
  if (!w) return alert('Allow pop-ups to print the bill.')
  w.document.write(`<html><head><title>Bill ${o.orderNo}</title><style>body{font-family:Arial,sans-serif;font-size:13px;padding:16px}table{width:100%;border-collapse:collapse}td,th{padding:4px 0;border-bottom:1px dashed #bbb}h2,p{margin:2px 0}</style></head><body>
  <h2>${shop.shopName}</h2><p>${shop.address}</p><p>Phone: ${shop.phone}</p><hr/>
  <p><b>Bill #${o.orderNo}</b></p><p>${fmtDate(o.createdAt)}</p><p>${o.customer.name} · ${o.customer.phone}</p><p>${o.address.text}</p><hr/>
  <table><tr><th align="left">Item</th><th>Qty</th><th align="right">Rate</th><th align="right">Amt</th></tr>${rows}</table>
  <p style="margin-top:8px">Subtotal: ₹${o.subtotal}</p><p>Delivery (${o.distanceKm} km): ₹${o.deliveryCharge}</p><h3>Total: ₹${o.total}</h3><p>Payment: Cash on Delivery</p><p style="margin-top:12px">Thank you!</p>
  <script>window.onload=()=>window.print()</script></body></html>`)
  w.document.close()
}

export default function AdminOrders({ orders }) {
  const shop = useSettings()
  const [filter, setFilter] = useState('active')
  const [staff, setStaff] = useState([])
  const [open, setOpen] = useState(null)

  useEffect(() => onSnapshot(query(collection(db, 'users'), where('role', '==', 'delivery')),
    (s) => setStaff(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {}), [])

  const shown = orders.filter((o) => filter === 'all' ? true
    : filter === 'active' ? !['delivered', 'cancelled'].includes(o.status) : o.status === filter)

  // Move an order to a new status. Stock is reduced when confirmed and restored if cancelled later.
  const move = async (o, status) => {
    const b = writeBatch(db)
    const patch = { status, updatedAt: serverTimestamp() }
    if (status === 'confirmed' && !o.stockCut) {
      o.items.forEach((i) => b.update(doc(db, 'products', i.id), { stock: increment(-(i.kg ?? i.qty)) }))
      patch.stockCut = true
    }
    if (status === 'cancelled' && o.stockCut) {
      o.items.forEach((i) => b.update(doc(db, 'products', i.id), { stock: increment(i.kg ?? i.qty) }))
      patch.stockCut = false
    }
    if (status === 'delivered') patch.cashCollected = true
    b.update(doc(db, 'orders', o.id), patch)
    try { await b.commit() } catch (e) { alert('Could not update: ' + e.message) }
  }
  const assign = async (o, uid) => {
    const p = staff.find((x) => x.id === uid)
    const b = writeBatch(db)
    b.update(doc(db, 'orders', o.id), { assignedTo: uid || null, assignedName: p?.name || '', assignedPhone: p?.phone || '', updatedAt: serverTimestamp() })
    await b.commit()
  }

  const tabs = [['active', 'Active'], ['placed', 'New'], ['out_for_delivery', 'Out'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['all', 'All']]
  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {tabs.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={filter === k ? 'btn-green btn-sm' : 'btn-line btn-sm'}>{l}</button>)}
      </div>
      {shown.length === 0 && <p className="py-10 text-center text-ink/60">No orders here.</p>}
      <div className="space-y-3">
        {shown.map((o) => {
          const next = STATUSES[STATUSES.indexOf(o.status) + 1]
          const isOpen = open === o.id
          return (
            <div key={o.id} className={`card ${o.status === 'placed' ? 'ring-2 ring-amber' : ''}`}>
              <button className="flex w-full flex-wrap items-center justify-between gap-2 text-left" onClick={() => setOpen(isOpen ? null : o.id)}>
                <span><b>#{o.orderNo}</b> · {o.customer.name} · {fmtDate(o.createdAt)}</span>
                <span className="flex items-center gap-2"><b>{money(o.total)}</b><span className={`badge ${TONE[o.status]}`}>{LABEL[o.status]}</span></span>
              </button>

              {isOpen && (
                <div className="mt-3 space-y-3 border-t border-cream-line pt-3 text-sm">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 font-semibold">Items</p>
                      {o.items.map((i, k) => <div key={k} className="flex justify-between"><span>{i.qty} × {i.name} ({i.unit})</span><span>{money(i.price * i.qty)}</span></div>)}
                      <div className="mt-2 border-t border-cream-line pt-1">
                        <div className="flex justify-between"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
                        <div className="flex justify-between"><span>Delivery ({o.distanceKm} km)</span><span>{money(o.deliveryCharge)}</span></div>
                        <div className="flex justify-between font-bold"><span>Total (COD)</span><span>{money(o.total)}</span></div>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 font-semibold">Customer</p>
                      <p>{o.customer.name} · {o.customer.phone}</p>
                      <p className="text-ink/70">{o.address.text}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a className="btn-line btn-sm" href={telLink(o.customer.phone)}>📞 Call</a>
                        <a className="btn-line btn-sm" target="_blank" rel="noreferrer" href={waLink(o.customer.phone, `Hello ${o.customer.name}, your order #${o.orderNo} at ${shop.shopName} is now ${LABEL[o.status]}.`)}>WhatsApp</a>
                        <a className="btn-line btn-sm" target="_blank" rel="noreferrer" href={mapsLink(o.address)}>🗺️ Map</a>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="font-medium">Delivery person:</label>
                    <select className="input !w-auto !py-1.5" value={o.assignedTo || ''} onChange={(e) => assign(o, e.target.value)}>
                      <option value="">Not assigned</option>
                      {staff.map((s) => <option key={s.id} value={s.id}>{s.name || s.email}</option>)}
                    </select>
                    {staff.length === 0 && <span className="text-xs text-ink/60">No delivery staff yet. Add them in Users &amp; staff.</span>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {o.status === 'placed' && <button className="btn-green btn-sm" onClick={() => move(o, 'confirmed')}>Accept order</button>}
                    {o.status !== 'placed' && next && <button className="btn-green btn-sm" onClick={() => move(o, next)}>Mark {LABEL[next].toLowerCase()}</button>}
                    {!['delivered', 'cancelled'].includes(o.status) && <button className="btn-line btn-sm text-red-600" onClick={() => confirm('Cancel this order?') && move(o, 'cancelled')}>{o.status === 'placed' ? 'Reject' : 'Cancel'}</button>}
                    <button className="btn-line btn-sm" onClick={() => printBill(o, shop)}>🖨️ Print bill</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
