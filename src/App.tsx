import { type CSSProperties, type FormEvent, type InputHTMLAttributes, type ReactNode, useEffect, useRef, useState } from 'react'
import { type Language, getInitialLanguage, languages, messages, saveLanguage } from './i18n'
import { AuthError, signIn } from './auth/client'

/** Places an element on the 1536 × 1024 reference artboard, in design pixels. */
function place(x: number, y: number, w?: number, h?: number): CSSProperties {
  return { '--x': x, '--y': y, ...(w === undefined ? {} : { '--w': w, '--h': h }) } as CSSProperties
}

/** Feature slots from the reference artboard; labels come from the active language. */
const features = [
  { icon: '/feature-subscriptions.svg', box: [100, 357, 28, 27], textX: 135.5 },
  { icon: '/feature-code.png', box: [274, 358, 27, 26], textX: 310.5 },
  { icon: '/feature-ready.png', box: [459, 357, 26, 27], textX: 495.5 },
] as const

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

function Field({
  icon,
  trailing,
  ...input
}: { icon: ReactNode; trailing?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span className="field-icon">{icon}</span>
      <input {...input} aria-label={input.placeholder} />
      {trailing}
    </label>
  )
}

function LanguageSwitch({ value, onChange }: { value: Language; onChange: (language: Language) => void }) {
  return (
    <div className="lang-switch" role="group" aria-label={messages[value].languageSwitch}>
      {languages.map((language) => (
        <button
          key={language}
          type="button"
          lang={messages[language].locale}
          aria-label={messages[language].languageName}
          aria-pressed={language === value}
          onClick={() => onChange(language)}
        >
          {messages[language].languageLabel}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const [language, setLanguage] = useState(getInitialLanguage)
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<keyof typeof messages.zh.authErrors | null>(null)
  const submitting = useRef(false)
  const t = messages[language]

  useEffect(() => {
    document.documentElement.lang = t.locale
  }, [t.locale])

  function changeLanguage(next: Language) {
    setLanguage(next)
    saveLanguage(next)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    try {
      const redirectTo = await signIn({
        username: String(form.get('username') ?? ''),
        password: String(form.get('password') ?? ''),
        next: new URLSearchParams(window.location.search).get('next') ?? '/',
      })
      window.location.assign(redirectTo)
    } catch (failure) {
      setError(failure instanceof AuthError ? failure.code : 'SERVER_ERROR')
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <main className="login-page" lang={t.locale}>
      <section className="brand-panel" aria-label={t.brandSection}>
        <img className="brand-art" src="/magpie-panel.png" width={768} height={1024} alt="" />
        <header className="brand place" style={place(101, 72.5)}>
          <img className="brand-logo" src="/magpie-logo-official.png" width={206} height={206} alt="" />
          <span className="brand-name">Magpie</span>
        </header>
        <h1 className="brand-title place" style={place(100, 184)}>
          {t.headline[0]}
          <em>{t.headline[1]}</em>
        </h1>
        <p className="brand-intro place" style={place(101, 253)}>
          {t.intro[0]}
          <br />
          {t.intro[1]}
        </p>
        <ul className="features">
          {features.map(({ icon, box: [x, y, w, h], textX }, index) => (
            <li key={icon}>
              <img className="feature-icon place" style={place(x, y, w, h)} src={icon} alt="" />
              <span className="feature-label place" style={place(textX, 359)}>
                {t.features[index]}
              </span>
            </li>
          ))}
        </ul>
        <p className="brand-foot">
          Magpie<span aria-hidden="true">·</span>AI Agent Gateway
        </p>
      </section>

      <section className="form-panel">
        <LanguageSwitch value={language} onChange={changeLanguage} />
        <form className="login-form" onSubmit={submit} aria-busy={pending}>
          <h2 className="form-title">{t.welcome}</h2>
          <p className="form-subtitle" role={error ? 'alert' : undefined} aria-live="polite">
            {error ? t.authErrors[error] : t.subtitle}
          </p>
          <div className="fields">
            <Field
              type="text"
              name="username"
              required
              maxLength={128}
              readOnly={pending}
              placeholder={t.username}
              autoComplete="username"
              icon={
                <Icon>
                  <circle cx="12" cy="7.5" r="4" />
                  <path d="M4.5 21c.7-4.2 3.2-6.3 7.5-6.3s6.8 2.1 7.5 6.3" />
                </Icon>
              }
            />
            <Field
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              maxLength={1024}
              readOnly={pending}
              placeholder={t.password}
              autoComplete="current-password"
              icon={
                <Icon>
                  <rect x="3.5" y="10" width="17" height="12" rx="3" />
                  <path d="M7.5 10V6.5a4.5 4.5 0 0 1 9 0V10M12 14.5V17" />
                </Icon>
              }
              trailing={
                <button
                  className="visibility"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                >
                  <Icon>
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <circle cx="12" cy="12" r="2.6" />
                    {!showPassword && <path d="m4.5 5.2 15 13.6" />}
                  </Icon>
                </button>
              }
            />
          </div>
          <button className="login-button" type="submit" disabled={pending}>
            {pending ? t.signingIn : t.signIn}
          </button>
        </form>
      </section>
    </main>
  )
}
