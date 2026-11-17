import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useLang } from '../context'

const friendly = (e) => ({
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'No account with this email. Create one first.',
  'auth/email-already-in-use': 'This email already has an account. Please log in.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/popup-closed-by-user': '',
  'auth/too-many-requests': 'Too many tries. Please wait a few minutes.',
}[e.code] ?? e.message)

function EyeIcon({ off }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
      {off && <path d="m3 3 18 18" />}
    </svg>
  )
}

export default function Login() {
  const { t } = useLang()
  const { user, role, login, signup, google } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ name: '', phone: '', email: '', password: '' })
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    if (user) nav(role === 'admin' ? '/admin' : role === 'delivery' ? '/delivery' : '/', { replace: true })
  }, [user, role, nav])

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try {
      if (mode === 'login') await login(f.email, f.password)
      else {
        if (!/^\d{10}$/.test(f.phone)) throw { message: 'Enter a 10 digit mobile number.' }
        await signup(f)
      }
    } catch (x) { setErr(friendly(x)) }
    setBusy(false)
  }
  const g = async () => { setErr(''); try { await google() } catch (x) { setErr(friendly(x)) } }

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-10">
      <div className="card p-5 sm:p-6">
        <h1 className="mb-5 text-2xl font-extrabold">{mode === 'login' ? t('login') : t('signup')}</h1>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (<>
            <div><label className="label">{t('yourName')}</label><input required className="input" value={f.name} onChange={set('name')} /></div>
            <div><label className="label">{t('yourPhone')}</label><input required inputMode="numeric" maxLength={10} className="input" value={f.phone} onChange={set('phone')} /></div>
          </>)}
          <div><label className="label">{t('email')}</label><input required type="email" autoComplete="email" className="input" value={f.email} onChange={set('email')} /></div>
          <div>
            <label className="label">{t('password')}</label>
            <div className="relative">
              <input required type={show ? 'text' : 'password'} minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="input pr-12" value={f.password} onChange={set('password')} />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink/60 hover:text-ink">
                <EyeIcon off={show} />
              </button>
            </div>
          </div>
          {err && <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{err}</p>}
          <button disabled={busy} className="btn-green w-full py-3 text-base">{mode === 'login' ? t('login') : t('signup')}</button>
        </form>
        <button onClick={g} className="btn-line mt-3 w-full py-3">{t('google')}</button>
        <p className="mt-5 text-center text-sm text-ink/70">
          {mode === 'login' ? t('noAcc') : t('haveAcc')}{' '}
          <button className="font-semibold text-forest" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr('') }}>
            {mode === 'login' ? t('signup') : t('login')}
          </button>
        </p>
      </div>
    </div>
  )
}
