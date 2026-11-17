import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalog, useLang } from '../context'
import ProductCard from '../components/ProductCard'

const DAY = 86400000
const isNew = (p) => {
  const d = p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0
  return Date.now() - d < 30 * DAY
}

export default function Shop() {
  const { t, tr } = useLang()
  const { products, categories, ready } = useCatalog()
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') || '').trim().toLowerCase()
  const cat = params.get('cat') || ''
  const tag = params.get('tag') || ''

  const list = useMemo(() => products.filter((p) => {
    if (p.active === false) return false
    if (cat && p.category !== cat) return false
    if (tag === 'deal' && !(p.deal || p.mrp > p.price)) return false
    if (tag === 'staple' && !p.staple) return false
    if (tag === 'new' && !isNew(p)) return false
    if (q && ![p.name, p.nameHi, p.nameMr, p.category].some((x) => (x || '').toLowerCase().includes(q))) return false
    return true
  }), [products, q, cat, tag])

  const pick = (c) => { const n = new URLSearchParams(params); c ? n.set('cat', c) : n.delete('cat'); setParams(n) }
  const chip = (on) => `whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${on ? 'bg-forest text-white' : 'bg-white ring-1 ring-cream-line hover:bg-cream-deep'}`

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => pick('')} className={chip(!cat)}>{t('allCats')}</button>
        {categories.map((c) => <button key={c.id} onClick={() => pick(c.name)} className={chip(cat === c.name)}>{tr(c)}</button>)}
      </div>
      {!ready ? <p className="py-16 text-center text-ink/60">Loading...</p>
        : list.length === 0 ? <p className="py-16 text-center text-ink/60">{t('noProducts')}</p>
        : <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
    </div>
  )
}
