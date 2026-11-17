import { Link, useNavigate } from 'react-router-dom'
import { useCart, useLang, useSettings } from '../context'
import { money } from '../lib/utils'
import { lineTotal } from '../lib/qty'
import WeightPicker from '../components/WeightPicker'

export default function Cart() {
  const { t, tr } = useLang()
  const { lines, subtotal, setQty } = useCart()
  const s = useSettings()
  const nav = useNavigate()
  const need = s.freeAbove - subtotal

  if (lines.length === 0) return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="mb-5 text-lg text-ink/70">{t('emptyCart')}</p>
      <Link to="/shop" className="btn-green">{t('continueShopping')}</Link>
    </div>
  )

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-3 py-6 sm:px-4 sm:py-8 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="mb-4 text-2xl font-extrabold sm:text-3xl">{t('cartTitle')}</h1>
        <div className="space-y-3">
          {lines.map((l) => (
            <div key={l.id} className="card !p-3 sm:!p-4">
              <div className="flex items-start gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cream-deep">
                  {l.image && <img src={l.image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{tr(l)}</p>
                  <p className="text-sm text-ink/60">{l.loose ? `${money(l.price)} / kg` : `${l.unit} · ${money(l.price)}`}</p>
                </div>
                <p className="shrink-0 font-bold">{money(lineTotal(l, l.qty))}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                {l.loose ? (
                  <WeightPicker value={l.qty} onChange={(kg) => setQty(l.id, kg)} max={Number(l.stock ?? 999)} />
                ) : (
                  <div className="flex items-center rounded-lg ring-1 ring-cream-line">
                    <button aria-label="Less" onClick={() => setQty(l.id, l.qty - 1)} className="px-4 py-2.5">−</button>
                    <span className="w-8 text-center font-semibold">{l.qty}</span>
                    <button aria-label="More" onClick={() => setQty(l.id, l.qty + 1)} className="px-4 py-2.5">+</button>
                  </div>
                )}
                <button onClick={() => setQty(l.id, 0)} className="py-2 text-sm text-red-600">{t('remove')}</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="card h-fit">
        <div className="flex justify-between py-1"><span>{t('subtotal')}</span><b>{money(subtotal)}</b></div>
        <p className={`mt-2 rounded-lg p-2.5 text-sm ${need > 0 ? 'bg-amber/20' : 'bg-leaf/15 text-forest'}`}>
          {need > 0 ? t('addMore', { n: Math.ceil(need) }) : t('freeAt', { n: s.freeAbove })}
        </p>
        {!s.isOpen && <p className="mt-2 rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{t('closedNote')}</p>}
        <button onClick={() => nav('/checkout')} disabled={!s.isOpen} className="btn-green mt-4 w-full py-3">{t('checkout')}</button>
        <Link to="/shop" className="mt-2 block py-2 text-center text-sm text-forest">{t('continueShopping')}</Link>
      </aside>
    </div>
  )
}
