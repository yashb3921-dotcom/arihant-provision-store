import { Link } from 'react-router-dom'
import { useCatalog, useLang } from '../context'
import ProductCard from '../components/ProductCard'

const FALLBACK_CATS = [
  { id: 'a', name: 'Atta & Rice', nameHi: 'आटा और चावल', nameMr: 'पीठ आणि तांदूळ', image: '/cat-atta-rice.jpg' },
  { id: 'b', name: 'Dal & Pulses', nameHi: 'दाल और दलहन', nameMr: 'डाळी आणि कडधान्ये', image: '/cat-dal-pulses.jpg' },
  { id: 'c', name: 'Dry Fruits & Snacks', nameHi: 'सूखे मेवे और स्नैक्स', nameMr: 'सुकामेवा आणि स्नॅक्स', image: '/cat-dry-fruits-snacks.jpg' },
  { id: 'd', name: 'Masala & Oil', nameHi: 'मसाले और तेल', nameMr: 'मसाले आणि तेल', image: '/cat-masala-oil.jpg' },
]

export default function Home() {
  const { t, tr } = useLang()
  const { products, categories } = useCatalog()
  const cats = categories.length ? categories : FALLBACK_CATS
  const live = products.filter((p) => p.active !== false && Number(p.stock) > 0)
  const popular = [...live.filter((p) => p.featured), ...live.filter((p) => !p.featured)].slice(0, 8)

  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="grid items-center gap-8 py-8 md:grid-cols-2 md:py-12">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">{t('heroTitle')}</h1>
          <p className="mt-5 max-w-md text-lg text-ink/80">{t('heroText')}</p>
          <Link to="/shop" className="btn-amber mt-7 px-7 py-3 text-lg">{t('shopNow')}</Link>
        </div>
        <img src="/hero.jpg" alt="Grains, pulses, oils and spices" className="aspect-[1.7] w-full rounded-3xl object-cover shadow-md" />
      </section>

      <section className="py-6">
        <h2 className="mb-5 text-2xl font-extrabold sm:text-3xl">{t('byCategory')}</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cats.map((c) => (
            <Link key={c.id} to={`/shop?cat=${encodeURIComponent(c.name)}`}
              className="flex flex-col items-center rounded-2xl bg-cream-deep p-3 text-center transition hover:bg-cream-line">
              {c.image
                ? <img src={c.image} alt="" className="aspect-[2/1] w-full rounded-xl object-cover mix-blend-multiply" />
                : <div className="aspect-[2/1] w-full rounded-xl bg-cream-line" />}
              <span className="mt-3 text-lg font-medium">{tr(c)}</span>
            </Link>
          ))}
        </div>
      </section>

      {popular.length > 0 && (
        <section className="py-8">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t('popular')}</h2>
            <Link to="/shop" className="font-semibold text-forest">{t('viewAll')}</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {popular.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
