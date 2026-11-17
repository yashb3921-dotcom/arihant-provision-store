import { useState } from 'react'
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import { useCatalog } from '../../context'
import { money, uploadImage } from '../../lib/utils'

/* ---------------- sample data (admin can edit or delete it) ---------------- */
const CATS = [
  ['Atta & Rice', 'आटा और चावल', 'पीठ आणि तांदूळ', '/cat-atta-rice.jpg'],
  ['Dal & Pulses', 'दाल और दलहन', 'डाळी आणि कडधान्ये', '/cat-dal-pulses.jpg'],
  ['Dry Fruits & Snacks', 'सूखे मेवे और स्नैक्स', 'सुकामेवा आणि स्नॅक्स', '/cat-dry-fruits-snacks.jpg'],
  ['Masala & Oil', 'मसाले और तेल', 'मसाले आणि तेल', '/cat-masala-oil.jpg'],
]
// [category, name, hindi, marathi, unit, price, mrp, stock, staple]
const PRODUCTS = [
  ['Atta & Rice', 'Wheat Atta', 'गेहूं का आटा', 'गव्हाचे पीठ', '5 kg', 235, 260, 40, true],
  ['Atta & Rice', 'Basmati Rice', 'बासमती चावल', 'बासमती तांदूळ', '1 kg', 110, 0, 50, true],
  ['Atta & Rice', 'Sona Masoori Rice', 'सोना मसूरी चावल', 'सोना मसूरी तांदूळ', '5 kg', 330, 360, 30, true],
  ['Atta & Rice', 'Poha', 'पोहा', 'पोहे', '500 g', 38, 0, 60, false],
  ['Dal & Pulses', 'Toor Dal', 'तूर दाल', 'तूर डाळ', '1 kg', 165, 175, 40, true],
  ['Dal & Pulses', 'Moong Dal', 'मूंग दाल', 'मूग डाळ', '1 kg', 120, 0, 40, true],
  ['Dal & Pulses', 'Chana Dal', 'चना दाल', 'हरभरा डाळ', '1 kg', 95, 0, 40, true],
  ['Dal & Pulses', 'Masoor Dal', 'मसूर दाल', 'मसूर डाळ', '1 kg', 90, 0, 35, false],
  ['Dry Fruits & Snacks', 'Cashew', 'काजू', 'काजू', '250 g', 260, 290, 25, false],
  ['Dry Fruits & Snacks', 'Almonds', 'बादाम', 'बदाम', '250 g', 240, 0, 25, false],
  ['Dry Fruits & Snacks', 'Roasted Peanuts', 'भुनी मूंगफली', 'भाजलेले शेंगदाणे', '500 g', 85, 0, 40, false],
  ['Dry Fruits & Snacks', 'Sev Bhujia', 'सेव भुजिया', 'शेव भुजिया', '400 g', 90, 99, 30, false],
  ['Masala & Oil', 'Sunflower Oil', 'सूरजमुखी तेल', 'सूर्यफूल तेल', '1 L', 135, 150, 50, true],
  ['Masala & Oil', 'Groundnut Oil', 'मूंगफली तेल', 'शेंगदाणा तेल', '1 L', 185, 0, 30, true],
  ['Masala & Oil', 'Turmeric Powder', 'हल्दी पाउडर', 'हळद पावडर', '200 g', 55, 0, 50, false],
  ['Masala & Oil', 'Red Chilli Powder', 'लाल मिर्च पाउडर', 'लाल तिखट', '200 g', 70, 0, 50, false],
  ['Masala & Oil', 'Goda Masala', 'गोडा मसाला', 'गोडा मसाला', '100 g', 65, 0, 40, false],
]

export async function seedSampleData() {
  const b = writeBatch(db)
  CATS.forEach(([name, nameHi, nameMr, image], i) => b.set(doc(collection(db, 'categories')), { name, nameHi, nameMr, image, order: i }))
  PRODUCTS.forEach(([category, name, nameHi, nameMr, unit, price, mrp, stock, staple]) =>
    b.set(doc(collection(db, 'products')), { category, name, nameHi, nameMr, unit, price, mrp, stock, staple, deal: mrp > price, featured: false, active: true, image: '', createdAt: serverTimestamp() }))
  await b.commit()
}

/* ---------------- small helpers ---------------- */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-6 w-full max-w-xl rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-extrabold">{title}</h3><button onClick={onClose} aria-label="Close" className="text-2xl leading-none">×</button></div>
        {children}
      </div>
    </div>
  )
}

function ImageField({ value, onChange }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const pick = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setBusy(true); setErr('')
    try { onChange(await uploadImage(file)) } catch (x) { setErr(x.message) }
    setBusy(false)
  }
  return (
    <div>
      <label className="label">Photo</label>
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 overflow-hidden rounded-lg bg-cream-deep">{value && <img src={value} alt="" className="h-full w-full object-cover" />}</div>
        <div><input type="file" accept="image/*" onChange={pick} className="text-sm" />{busy && <p className="text-xs">Uploading...</p>}{err && <p className="text-xs text-red-600">{err}</p>}</div>
      </div>
    </div>
  )
}

/* ---------------- CSV import ---------------- */
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = '' }
    else cur += c
  }
  if (cur || row.length) { row.push(cur); rows.push(row) }
  return rows.filter((r) => r.some((x) => x.trim()))
}
const TEMPLATE = 'name,nameHi,nameMr,category,unit,price,mrp,stock,image,loose\nToor Dal,तूर दाल,तूर डाळ,Dal & Pulses,1 kg,165,175,40,,yes\n'

/* ---------------- Products ---------------- */
const BLANK = { name: '', nameHi: '', nameMr: '', category: '', unit: '', price: '', mrp: '', stock: '', image: '', active: true, deal: false, staple: false, featured: false, loose: false }

export function AdminProducts() {
  const { products, categories } = useCatalog()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null)
  const [msg, setMsg] = useState('')
  const list = products.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))

  const save = async (e) => {
    e.preventDefault()
    const d = { ...edit, price: Number(edit.price), mrp: Number(edit.mrp) || 0, stock: Number(edit.stock) || 0 }
    const { id, ...data } = d
    if (!data.name || !data.category || !(data.price >= 0)) return alert('Name, category and price are required.')
    if (id) await updateDoc(doc(db, 'products', id), data)
    else await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp() })
    setEdit(null)
  }
  const remove = (p) => confirm(`Delete "${p.name}"?`) && deleteDoc(doc(db, 'products', p.id))
  const setStock = (p, v) => Number(v) !== Number(p.stock) && updateDoc(doc(db, 'products', p.id), { stock: Number(v) || 0 })

  const importCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const rows = parseCSV(await file.text())
    const head = rows[0].map((h) => h.trim())
    const b = writeBatch(db); let n = 0
    rows.slice(1, 400).forEach((r) => {
      const o = Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()]))
      if (!o.name || !o.category || !o.price) return
      b.set(doc(collection(db, 'products')), {
        name: o.name, nameHi: o.nameHi || '', nameMr: o.nameMr || '', category: o.category, unit: o.unit || '',
        price: Number(o.price), mrp: Number(o.mrp) || 0, stock: Number(o.stock) || 0, image: o.image || '',
        active: true, deal: Number(o.mrp) > Number(o.price), staple: false, featured: false, loose: ['yes', 'true', '1'].includes((o.loose || '').toLowerCase()), createdAt: serverTimestamp(),
      }); n++
    })
    await b.commit(); setMsg(`Imported ${n} products.`); e.target.value = ''
  }
  const download = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' })); a.download = 'products-template.csv'; a.click()
  }
  const f = (k) => (e) => setEdit({ ...edit, [k]: e.target.value })
  const chk = (k, label) => <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.checked })} />{label}</label>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-green" onClick={() => setEdit({ ...BLANK, category: categories[0]?.name || '' })}>+ Add product</button>
        <label className="btn-line cursor-pointer">Import CSV<input type="file" accept=".csv" hidden onChange={importCSV} /></label>
        <button className="btn-line" onClick={download}>CSV template</button>
        {msg && <span className="text-sm text-forest">{msg}</span>}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-cream-deep"><tr><th className="p-3">Product</th><th className="hidden p-3 sm:table-cell">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Shown</th><th className="p-3"></th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-t border-cream-line">
                <td className="p-3"><div className="flex items-center gap-2"><div className="h-10 w-10 overflow-hidden rounded bg-cream-deep">{p.image && <img src={p.image} alt="" className="h-full w-full object-cover" />}</div><div><p className="font-medium">{p.name}</p><p className="text-xs text-ink/50">{p.unit}</p></div></div></td>
                <td className="hidden p-3 sm:table-cell">{p.category}</td>
                <td className="whitespace-nowrap p-3">{money(p.price)}{p.loose && <span className="text-xs text-ink/60"> /kg</span>}</td>
                <td className="p-3"><input type="number" min="0" step="any" defaultValue={p.stock} key={p.stock} onBlur={(e) => setStock(p, e.target.value)} className={`input !w-20 !py-1.5 ${Number(p.stock) <= 5 ? 'border-red-400' : ''}`} /></td>
                <td className="p-3"><input type="checkbox" checked={p.active !== false} onChange={(e) => updateDoc(doc(db, 'products', p.id), { active: e.target.checked })} /></td>
                <td className="whitespace-nowrap p-3 text-right"><button className="btn-line btn-sm" onClick={() => setEdit(p)}>Edit</button> <button className="btn-line btn-sm text-red-600" onClick={() => remove(p)}>Delete</button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan="6" className="p-6 text-center text-ink/60">No products yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Edit product' : 'Add product'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-3">
            <div><label className="label">Name (English)</label><input required className="input" value={edit.name} onChange={f('name')} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Name (Hindi)</label><input className="input" value={edit.nameHi || ''} onChange={f('nameHi')} /></div>
              <div><label className="label">Name (Marathi)</label><input className="input" value={edit.nameMr || ''} onChange={f('nameMr')} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Category</label>
                <select required className="input" value={edit.category} onChange={f('category')}>
                  <option value="">Select</option>{categories.map((c) => <option key={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className="label">Pack size</label><input className="input" placeholder="1 kg, 500 g, 1 L" value={edit.unit} onChange={f('unit')} /></div>
              <div><label className="label">{edit.loose ? 'Price per 1 kg (₹)' : 'Selling price (₹)'}</label><input required type="number" min="0" step="any" className="input" value={edit.price} onChange={f('price')} /></div>
              <div><label className="label">MRP (₹), optional</label><input type="number" min="0" step="any" className="input" value={edit.mrp} onChange={f('mrp')} /></div>
              <div><label className="label">{edit.loose ? 'Stock (in kg)' : 'Stock'}</label><input required type="number" min="0" step="any" className="input" value={edit.stock} onChange={f('stock')} /></div>
            </div>
            <ImageField value={edit.image} onChange={(url) => setEdit({ ...edit, image: url })} />
            <div className="flex flex-wrap gap-4">{chk('loose', 'Sold loose by weight (250 g, 500 g, 1 kg, custom)')}{chk('active', 'Show in shop')}{chk('deal', 'Deal')}{chk('staple', 'Monthly staple')}{chk('featured', 'Show on home page')}</div>
            <button className="btn-green w-full">Save product</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ---------------- Categories ---------------- */
export function AdminCategories() {
  const { categories } = useCatalog()
  const [edit, setEdit] = useState(null)
  const save = async (e) => {
    e.preventDefault()
    const { id, ...data } = { ...edit, order: Number(edit.order) || 0 }
    if (!data.name) return
    if (id) await updateDoc(doc(db, 'categories', id), data); else await addDoc(collection(db, 'categories'), data)
    setEdit(null)
  }
  const f = (k) => (e) => setEdit({ ...edit, [k]: e.target.value })
  return (
    <div className="space-y-4">
      <button className="btn-green" onClick={() => setEdit({ name: '', nameHi: '', nameMr: '', image: '', order: categories.length })}>+ Add category</button>
      <p className="text-sm text-ink/60">If you rename a category, also update the category of its products.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div key={c.id} className="card flex items-center gap-3">
            <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-cream-deep">{c.image && <img src={c.image} alt="" className="h-full w-full object-cover" />}</div>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.name}</p><p className="truncate text-xs text-ink/60">{c.nameHi} · {c.nameMr}</p></div>
            <div className="flex flex-col gap-1">
              <button className="btn-line btn-sm" onClick={() => setEdit(c)}>Edit</button>
              <button className="btn-line btn-sm text-red-600" onClick={() => confirm(`Delete "${c.name}"?`) && deleteDoc(doc(db, 'categories', c.id))}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Edit category' : 'Add category'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-3">
            <div><label className="label">Name (English)</label><input required className="input" value={edit.name} onChange={f('name')} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Name (Hindi)</label><input className="input" value={edit.nameHi || ''} onChange={f('nameHi')} /></div>
              <div><label className="label">Name (Marathi)</label><input className="input" value={edit.nameMr || ''} onChange={f('nameMr')} /></div>
            </div>
            <div><label className="label">Order on home page (0 shows first)</label><input type="number" className="input" value={edit.order} onChange={f('order')} /></div>
            <ImageField value={edit.image} onChange={(url) => setEdit({ ...edit, image: url })} />
            <button className="btn-green w-full">Save category</button>
          </form>
        </Modal>
      )}
    </div>
  )
}
