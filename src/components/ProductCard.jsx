import { useState } from 'react'
import { useCart, useLang } from '../context'
import { money } from '../lib/utils'
import { QL, lineTotal, weightLabel } from '../lib/qty'
import WeightPicker from './WeightPicker'

export default function ProductCard({ p }) {
  const { t, tr, lang } = useLang()
  const q = QL[lang] || QL.en
  const { qtyOf, setQty } = useCart()
  const [w, setW] = useState(0.5)
  const qty = qtyOf(p.id)
  const stock = Number(p.stock ?? 0)
  const out = stock <= 0
  const sel = Math.min(w, stock)
  const off = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0

  return (
    <div className="card flex flex-col !p-3 sm:!p-4">
      <div className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-cream-deep">
        {p.image
          ? <img src={p.image} alt={tr(p)} loading="lazy" className={`h-full w-full object-cover ${out ? 'opacity-50' : ''}`} />
          : <span className="px-2 text-center text-sm text-ink/40">{tr(p)}</span>}
        {off > 0 && <span className="badge absolute left-2 top-2 bg-amber text-ink">{off}% {t('off')}</span>}
      </div>
      <h3 className="line-clamp-2 min-h-[2.75rem] font-semibold leading-snug">{tr(p)}</h3>
      {!p.loose && <p className="text-sm text-ink/60">{p.unit}</p>}
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-lg font-bold">{money(p.price)}</span>
        {p.loose && <span className="text-sm text-ink/60">{q.perKg}</span>}
        {off > 0 && <span className="text-sm text-ink/50 line-through">{money(p.mrp)}</span>}
      </div>
      {!out && stock <= 5 && <p className="text-xs font-medium text-amber-dark">{t('onlyLeft', { n: p.loose ? `${stock} kg` : stock })}</p>}

      <div className="mt-auto pt-3">
        {out ? <button disabled className="btn-line w-full">{t('outOfStock')}</button>
          : p.loose ? (
            <div className="space-y-2">
              <WeightPicker value={sel} onChange={setW} max={stock} />
              <button onClick={() => setQty(p.id, qty + sel)} className="btn-green w-full">{q.add} · {money(lineTotal(p, sel))}</button>
              {qty > 0 && (
                <p className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-forest">{q.inCart}: {weightLabel(qty)}</span>
                  <button onClick={() => setQty(p.id, 0)} className="text-red-600">{t('remove')}</button>
                </p>
              )}
            </div>
          )
          : qty === 0 ? <button onClick={() => setQty(p.id, 1)} className="btn-green w-full">{t('add')}</button>
          : (
            <div className="flex items-center justify-between rounded-lg bg-forest text-white">
              <button aria-label="Less" onClick={() => setQty(p.id, qty - 1)} className="px-4 py-2.5 text-lg">−</button>
              <span className="font-semibold">{qty}</span>
              <button aria-label="More" onClick={() => setQty(p.id, qty + 1)} className="px-4 py-2.5 text-lg">+</button>
            </div>
          )}
      </div>
    </div>
  )
}
