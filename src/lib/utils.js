import { CLOUD, PRESET } from '../config'

export const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export const toDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null)
export const fmtDate = (ts) => {
  const d = toDate(ts)
  return d ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''
}

// Straight-line distance between two points on Earth (km)
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const rad = (x) => (x * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// Road distance from the free OSRM server. Falls back to straight-line x 1.3 if it is busy.
export async function roadDistanceKm(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
    const r = await fetch(url)
    const j = await r.json()
    if (j.routes?.[0]) return Math.round((j.routes[0].distance / 1000) * 10) / 10
  } catch (e) { /* use fallback */ }
  return Math.round(haversine(from.lat, from.lng, to.lat, to.lng) * 1.3 * 10) / 10
}

// Free address search (OpenStreetMap Nominatim), biased to the area around the shop
export async function geocode(text, shop) {
  const d = 0.5
  const box = `${shop.lng - d},${shop.lat + d},${shop.lng + d},${shop.lat - d}`
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&viewbox=${box}&q=${encodeURIComponent(text)}`
  const r = await fetch(url, { headers: { Accept: 'application/json' } })
  const j = await r.json()
  return j[0] ? { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon), name: j[0].display_name } : null
}

export async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
    const j = await r.json()
    return j.display_name || ''
  } catch (e) { return '' }
}

export function deliveryCharge(subtotal, km, s) {
  if (subtotal >= s.freeAbove) return 0
  return Math.round(km * s.ratePerKm)
}

// Upload a product photo to Cloudinary (free, unsigned preset)
export async function uploadImage(file) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', PRESET)
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: fd })
  const j = await r.json()
  if (!j.secure_url) throw new Error(j.error?.message || 'Upload failed')
  return j.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_600/')
}

export const telLink = (p) => `tel:+91${String(p).replace(/\D/g, '').slice(-10)}`
export const waLink = (p, text = '') => `https://wa.me/91${String(p).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(text)}`
export const mapsLink = (a) =>
  a?.lat ? `https://www.google.com/maps/dir/?api=1&destination=${a.lat},${a.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a?.text || '')}`
