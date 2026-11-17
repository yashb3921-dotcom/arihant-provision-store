import { useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth, useCart, useLang, useSettings } from '../context'
import { LANGS } from '../i18n'
import { telLink, waLink } from '../lib/utils'

export default function Layout() {
  const { t, lang, setLang } = useLang()
  const { count } = useCart()
  const { user, role, loading, logout } = useAuth()
  const s = useSettings()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')

  // The admin works only inside the admin dashboard, never in the shop pages
  if (!loading && role === 'admin') return <Navigate to="/admin" replace />

  const submit = (e) => { e.preventDefault(); nav(`/shop?q=${encodeURIComponent(q)}`) }
  const links = [
    ['/shop', t('all')], ['/shop?tag=deal', t('deals')], ['/shop?tag=staple', t('staples')], ['/shop?tag=new', t('fresh')],
  ]

  const searchForm = (
    <form onSubmit={submit} className="w-full">
      <div className="flex items-center rounded-full border border-cream-line bg-white px-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')}
          aria-label="Search" className="w-full min-w-0 bg-transparent py-2.5 outline-none" />
        <button aria-label="Search" className="text-ink/60 hover:text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        </button>
      </div>
    </form>
  )

  const langSwitch = (
    <div className="flex overflow-hidden rounded-lg border border-cream-line bg-white text-sm">
      {LANGS.map((l) => (
        <button key={l.code} onClick={() => setLang(l.code)}
          className={`px-3 py-2.5 ${lang === l.code ? 'bg-ink text-white' : 'hover:bg-cream-deep'}`}>{l.label}</button>
      ))}
    </div>
  )

  const authButtons = user ? (
    <>
      {role === 'delivery' && <Link to="/delivery" className="btn-amber">{t('delivery')}</Link>}
      <Link to="/account" className="btn-line">{t('account')}</Link>
      <button onClick={logout} className="btn-line">{t('logout')}</button>
    </>
  ) : <Link to="/login" className="btn-amber min-w-[110px] px-6">{t('login')}</Link>

  const cartButton = (
    <Link to="/cart" className="btn-green whitespace-nowrap">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 11.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 7H6"/></svg>
      {t('cart')} ({count})
    </Link>
  )

  const logo = (
    <Link to="/" className="flex min-w-0 items-center gap-2.5">
      <img src="/logo.png" alt="" className="h-10 w-10 shrink-0 rounded-full sm:h-11 sm:w-11" />
      <span className="text-base font-extrabold leading-tight text-ink sm:text-xl">{s.shopName}</span>
    </Link>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-cream-line bg-cream/95 backdrop-blur">
        {/* Phones: 3 rows */}
        <div className="space-y-2.5 px-3 pt-2.5 sm:hidden">
          <div className="flex items-center justify-between gap-2">{logo}{cartButton}</div>
          {searchForm}
          <div className="flex flex-wrap items-center justify-between gap-2">{langSwitch}<div className="flex flex-wrap items-center gap-2">{authButtons}</div></div>
        </div>

        {/* Tablets and computers: 1 row */}
        <div className="mx-auto hidden max-w-6xl items-center gap-3 px-4 py-3 sm:flex">
          {logo}
          <div className="min-w-[160px] flex-1">{searchForm}</div>
          {langSwitch}
          <div className="flex items-center gap-2">{authButtons}</div>
          {cartButton}
        </div>

        <nav className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-3 py-2.5 text-[15px] sm:px-4">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end className="whitespace-nowrap py-1 text-ink/80 hover:text-forest">{label}</NavLink>
          ))}
          <a href="#contact" className="whitespace-nowrap py-1 text-ink/80 hover:text-forest">{t('contact')}</a>
        </nav>
      </header>

      {!s.isOpen && <div className="bg-amber px-4 py-2 text-center text-sm font-medium">{t('closedNote')}</div>}

      <main className="flex-1"><Outlet /></main>

      <footer id="contact" className="mt-16 bg-forest text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <img src="/logo.png" alt={s.shopName} className="mb-3 h-20 w-20 rounded-full" />
            <p className="font-bold">{s.shopName}</p>
            <p className="text-sm text-white/80">Kirana &amp; Provisions · Since 2007</p>
          </div>
          <div className="text-sm text-white/90">
            <p className="mb-1 font-semibold text-white">{t('findUs')}</p>
            <p>{s.address}</p>
            <p className="mt-2">{t('openHours')}: {s.hours}</p>
          </div>
          <div className="flex flex-col items-start gap-2 text-sm">
            <a className="btn-amber btn-sm" href={telLink(s.phone)}>{t('callUs')}: {s.phone}</a>
            <a className="btn btn-sm bg-white text-forest hover:bg-cream-deep" href={waLink(s.whatsapp, 'Hello Arihant Provision Stores')} target="_blank" rel="noreferrer">{t('whatsapp')}</a>
          </div>
        </div>
        <p className="border-t border-white/15 py-3 text-center text-xs text-white/60">© {new Date().getFullYear()} {s.shopName}</p>
      </footer>
    </div>
  )
}
