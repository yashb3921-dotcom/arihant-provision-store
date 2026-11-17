import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDoc, collection, doc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth, useCart, useLang, useSettings } from '../context'
import { deliveryCharge, geocode, money, reverseGeocode, roadDistanceKm } from '../lib/utils'
import { lineText, lineTotal, weightLabel } from '../lib/qty'

export default function Checkout() {
  const { t, tr } = useLang()
  const { user, profile } = useAuth()
  const { lines, subtotal, clear } = useCart()
  const s = useSettings()
  const nav = useNavigate()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [addr, setAddr] = useState('')
  const [pt, setPt] = useState(null)       // {lat, lng}
  const [km, setKm] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [saveAddr, setSaveAddr] = useState(false)

  useEffect(() => { if (profile) { setName((n) => n || profile.name || ''); setPhone((p) => p || profile.phone || '') } }, [profile])

  const measure = async (point) => {
    const d = await roadDistanceKm({ lat: s.shopLat, lng: s.shopLng }, point)
    setPt(point); setKm(d)
    if (d > s.maxKm) setMsg(t('tooFar', { n: s.maxKm })); else setMsg('')
  }

  const useLive = () => {
    setMsg(t('locating'))
    if (!navigator.geolocation) return setMsg(t('locFail'))
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      const text = await reverseGeocode(point.lat, point.lng)
      if (text) setAddr((a) => (a.trim() ? a : text))
      await measure(point)
    }, () => setMsg(t('locFail')), { enableHighAccuracy: true, timeout: 15000 })
  }

  const check = async () => {
    if (!addr.trim()) return setMsg(t('needAddr'))
    setMsg('...')
    try {
      const g = await geocode(addr, { lat: s.shopLat, lng: s.shopLng })
      if (!g) { setPt(null); setKm(null); return setMsg(t('geoFail')) }
      await measure({ lat: g.lat, lng: g.lng })
    } catch (e) { setMsg(t('geoFail')) }
  }

  const charge = km == null ? 0 : deliveryCharge(subtotal, km, s)
  const total = subtotal + charge

  const place = async () => {
    if (!user) return setMsg(t('loginToOrder'))
    if (!s.isOpen) return setMsg(t('closedNote'))
    if (!name.trim() || !/^\d{10}$/.test(phone)) return setMsg('Enter your name and a 10 digit mobile number.')
    if (km == null || !pt) return setMsg(t('needAddr'))
    if (km > s.maxKm) return setMsg(t('tooFar', { n: s.maxKm }))
    if (subtotal < s.minOrder) return setMsg(t('minOrderMsg', { n: s.minOrder }))
    const bad = lines.find((l) => l.qty > Number(l.stock ?? 0))
    if (bad) return setMsg(`${tr(bad)}: ${t('onlyLeft', { n: bad.stock })}`)

    setBusy(true)
    try {
      const ref = await addDoc(collection(db, 'orders'), {
        orderNo: 'AR' + Date.now().toString().slice(-6),
        userId: user.uid,
        customer: { name: name.trim(), phone },
        items: lines.map((l) => l.loose
          ? { id: l.id, name: l.name, price: lineTotal(l, l.qty), qty: 1, unit: weightLabel(l.qty), kg: l.qty, loose: true }
          : { id: l.id, name: l.name, price: l.price, qty: l.qty, unit: l.unit || '' }),
        address: { text: addr.trim(), lat: pt.lat, lng: pt.lng },
        distanceKm: km, subtotal, deliveryCharge: charge, total,
        status: 'placed', paymentMethod: 'COD',
        assignedTo: null, assignedName: '', assignedPhone: '', cashCollected: false, stockCut: false,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      if (saveAddr) await updateDoc(doc(db, 'users', user.uid), { addresses: arrayUnion({ text: addr.trim(), lat: pt.lat, lng: pt.lng }) }).catch(() => {})
      clear()
      nav('/account', { state: { placed: ref.id } })
    } catch (e) {
      console.error(e); setMsg('Could not place the order. Please try again.')
    }
    setBusy(false)
  }

  if (lines.length === 0) return (
    <div className="px-4 py-20 text-center"><p className="mb-4">{t('emptyCart')}</p><Link to="/shop" className="btn-green">{t('continueShopping')}</Link></div>
  )

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-3 py-6 sm:px-4 sm:py-8 lg:grid-cols-[1fr_340px]">
      <div className="card space-y-4">
        <h1 className="text-2xl font-extrabold">{t('checkoutTitle')}</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">{t('yourName')}</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="label">{t('yourPhone')}</label><input className="input" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>

        {profile?.addresses?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.addresses.map((a, i) => (
              <button key={i} onClick={() => { setAddr(a.text); measure({ lat: a.lat, lng: a.lng }) }}
                className="btn-line btn-sm max-w-full truncate">{a.text.slice(0, 40)}</button>
            ))}
          </div>
        )}

        <div>
          <label className="label">{t('addrLabel')}</label>
          <textarea rows={3} className="input" placeholder={t('addrHint')} value={addr}
            onChange={(e) => { setAddr(e.target.value); setKm(null); setPt(null) }} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={useLive} className="btn-line btn-sm">📍 {t('useLocation')}</button>
          <button type="button" onClick={check} className="btn-amber btn-sm">{t('findAddr')}</button>
        </div>
        {km != null && <p className="rounded-lg bg-leaf/15 p-2.5 text-sm text-forest">{t('distance')}: <b>{km} {t('km')}</b></p>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} /> {t('saveAddr')}</label>

        <div className="rounded-xl bg-cream-deep p-3">
          <p className="font-semibold">{t('cod')}</p>
          <p className="text-sm text-ink/70">{t('codNote')}</p>
        </div>
      </div>

      <aside className="card h-fit">
        <div className="space-y-1 border-b border-cream-line pb-3 text-sm">
          {lines.map((l) => <div key={l.id} className="flex justify-between gap-2"><span className="truncate">{lineText(l, tr(l))}</span><span>{money(lineTotal(l, l.qty))}</span></div>)}
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex justify-between"><span>{t('subtotal')}</span><span>{money(subtotal)}</span></div>
          <div className="flex justify-between"><span>{t('deliveryCharge')}</span><span>{km == null ? '—' : charge === 0 ? t('free') : money(charge)}</span></div>
          <div className="flex justify-between border-t border-cream-line pt-2 text-lg font-extrabold"><span>{t('total')}</span><span>{money(total)}</span></div>
        </div>
        {msg && <p role="alert" className="mt-3 rounded-lg bg-amber/20 p-2.5 text-sm">{msg}</p>}
        <button onClick={place} disabled={busy} className="btn-green mt-4 w-full py-3">{busy ? t('placing') : t('placeOrder')}</button>
      </aside>
    </div>
  )
}
