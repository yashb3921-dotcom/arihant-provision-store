import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signOut, updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'
import { DEFAULT_SETTINGS } from './config'
import { dict } from './i18n'
import { r3, lineTotal } from './lib/qty'

/* ---------------- Language ---------------- */
const LangCtx = createContext()
export const useLang = () => useContext(LangCtx)

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'en')
  const setLang = (l) => { localStorage.setItem('lang', l); setLangState(l); document.documentElement.lang = l }
  const t = useCallback((key, vars = {}) => {
    let s = dict[lang]?.[key] ?? dict.en[key] ?? key
    Object.entries(vars).forEach(([k, v]) => { s = s.replace(`{${k}}`, v) })
    return s
  }, [lang])
  // pick the Hindi / Marathi name of a product or category when the admin has entered one
  const tr = useCallback((item, field = 'name') => {
    if (!item) return ''
    const suffix = lang === 'hi' ? 'Hi' : lang === 'mr' ? 'Mr' : ''
    return (suffix && item[field + suffix]) || item[field] || ''
  }, [lang])
  return <LangCtx.Provider value={{ lang, setLang, t, tr }}>{children}</LangCtx.Provider>
}

/* ---------------- Auth ---------------- */
const AuthCtx = createContext()
export const useAuth = () => useContext(AuthCtx)
let pendingProfile = null // name and phone typed on the signup form

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile = () => {}
    const unsub = onAuthStateChanged(auth, async (u) => {
      unsubProfile()
      setUser(u)
      if (!u) { setProfile(null); setLoading(false); return }
      const ref = doc(db, 'users', u.uid)
      try {
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          await setDoc(ref, {
            name: pendingProfile?.name || u.displayName || '',
            phone: pendingProfile?.phone || '',
            email: u.email || '',
            role: 'customer',
            addresses: [],
            createdAt: serverTimestamp(),
          })
          pendingProfile = null
        }
      } catch (e) { console.error('profile create failed', e) }
      unsubProfile = onSnapshot(ref, (s) => {
        setProfile(s.exists() ? { id: s.id, ...s.data() } : null)
        setLoading(false)
      }, () => setLoading(false))
    })
    return () => { unsub(); unsubProfile() }
  }, [])

  const value = useMemo(() => ({
    user, profile, loading,
    role: profile?.role || 'customer',
    login: (email, pw) => signInWithEmailAndPassword(auth, email, pw),
    google: () => signInWithPopup(auth, googleProvider),
    signup: async ({ name, phone, email, password }) => {
      pendingProfile = { name, phone }
      const c = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(c.user, { displayName: name })
      return c
    },
    logout: () => signOut(auth),
  }), [user, profile, loading])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

/* ---------------- Shop settings ---------------- */
const SettingsCtx = createContext(DEFAULT_SETTINGS)
export const useSettings = () => useContext(SettingsCtx)

export function SettingsProvider({ children }) {
  const [s, setS] = useState(DEFAULT_SETTINGS)
  useEffect(() => onSnapshot(doc(db, 'settings', 'store'),
    (snap) => setS({ ...DEFAULT_SETTINGS, ...(snap.exists() ? snap.data() : {}) }), () => {}), [])
  return <SettingsCtx.Provider value={s}>{children}</SettingsCtx.Provider>
}

/* ---------------- Catalog (products + categories, live) ---------------- */
const CatalogCtx = createContext({ products: [], categories: [], ready: false })
export const useCatalog = () => useContext(CatalogCtx)

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'products'), (s) => {
      setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      setReady(true)
    }, () => setReady(true))
    const u2 = onSnapshot(collection(db, 'categories'), (s) => {
      setCategories(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order ?? 99) - (b.order ?? 99)))
    }, () => {})
    return () => { u1(); u2() }
  }, [])
  return <CatalogCtx.Provider value={{ products, categories, ready }}>{children}</CatalogCtx.Provider>
}

/* ---------------- Cart ---------------- */
const CartCtx = createContext()
export const useCart = () => useContext(CartCtx)

export function CartProvider({ children }) {
  const { products } = useCatalog()
  const [raw, setRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]') } catch (e) { return [] }
  })
  useEffect(() => { localStorage.setItem('cart', JSON.stringify(raw)) }, [raw])

  const lines = useMemo(() => raw
    .map((c) => { const p = products.find((x) => x.id === c.id); return p ? { ...p, qty: c.qty } : null })
    .filter((l) => l && l.active !== false), [raw, products])

  const setQty = (id, qty) => {
    const p = products.find((x) => x.id === id)
    const max = p ? Number(p.stock ?? 999) : 999
    qty = r3(Math.min(qty, max))
    setRaw((r) => qty <= 0 ? r.filter((c) => c.id !== id)
      : r.some((c) => c.id === id) ? r.map((c) => c.id === id ? { ...c, qty } : c) : [...r, { id, qty }])
  }
  const qtyOf = (id) => raw.find((c) => c.id === id)?.qty || 0
  const subtotal = lines.reduce((s, l) => s + lineTotal(l, l.qty), 0)
  const count = lines.reduce((s, l) => s + (l.loose ? 1 : l.qty), 0)
  const clear = () => setRaw([])
  const addMany = (items) => items.forEach((i) => setQty(i.id, qtyOf(i.id) + i.qty))

  return <CartCtx.Provider value={{ lines, subtotal, count, setQty, qtyOf, clear, addMany }}>{children}</CartCtx.Provider>
}
