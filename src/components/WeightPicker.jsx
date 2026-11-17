import { useState } from 'react'
import { useLang } from '../context'
import { QL, r3 } from '../lib/qty'

const PRESETS = [0.25, 0.5, 1]

// value and max are in kg. Shows 250 g / 500 g / 1 kg and a custom box (in grams).
export default function WeightPicker({ value, onChange, max = 999 }) {
  const { lang } = useLang()
  const q = QL[lang] || QL.en
  const [custom, setCustom] = useState(!PRESETS.includes(value))
  const [txt, setTxt] = useState(String(Math.round(value * 1000)))

  const chip = (on) => `rounded-lg px-2.5 py-2 text-[13px] font-semibold leading-none disabled:opacity-40 ${on ? 'bg-forest text-white' : 'bg-white ring-1 ring-cream-line hover:bg-cream-deep'}`
  const pick = (kg) => { setCustom(false); onChange(Math.min(kg, max)) }
  const type = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 5)
    setTxt(v)
    const g = Number(v)
    if (g >= 50) onChange(Math.min(r3(g / 1000), max))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((kg) => (
          <button key={kg} type="button" disabled={kg > max} onClick={() => pick(kg)} className={chip(!custom && value === kg)}>
            {kg < 1 ? `${kg * 1000} g` : '1 kg'}
          </button>
        ))}
        <button type="button" onClick={() => { setCustom(true); setTxt(String(Math.round(value * 1000))) }} className={chip(custom)}>{q.custom}</button>
      </div>
      {custom && (
        <div className="flex items-center gap-2">
          <input inputMode="numeric" value={txt} onChange={type} aria-label={q.grams} className="input !w-24 !py-2" />
          <span className="text-xs text-ink/60">{q.grams} ({q.min})</span>
        </div>
      )}
    </div>
  )
}
