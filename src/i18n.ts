import type { AuthErrorCode } from './auth/client'

export const languages = ['zh', 'en'] as const

export type Language = (typeof languages)[number]

export interface Messages {
  /** BCP 47 tag for the `lang` attribute while this language is active. */
  locale: string
  /** Label in the language switch, written in this language. */
  languageLabel: string
  /** Accessible name of this language's switch option. */
  languageName: string
  languageSwitch: string
  brandSection: string
  /** Hero headline: plain lead-in, then the highlighted phrase. */
  headline: readonly [lead: string, highlight: string]
  /** Hero intro, split where the reference layout breaks the line. */
  intro: readonly [string, string]
  /** Feature labels in display order; each must fit its fixed slot in the reference layout. */
  features: readonly [string, string, string]
  welcome: string
  subtitle: string
  username: string
  password: string
  showPassword: string
  hidePassword: string
  signIn: string
  signingIn: string
  authErrors: Record<AuthErrorCode, string>
}

export const messages: Record<Language, Messages> = {
  zh: {
    locale: 'zh-CN',
    languageLabel: '中文',
    languageName: '简体中文',
    languageSwitch: '界面语言',
    brandSection: 'Magpie 品牌介绍',
    headline: ['所有 ', 'Agent 的模型，一处搞定'],
    intro: ['所有 Agent 共用一个本地网关，', '额度用完时，它会悄悄切到下一个账号。'],
    features: ['多订阅管理', '智能路由切换', '开箱即用'],
    welcome: '欢迎回来',
    subtitle: '登录 Magpie，开始统一管理你的AI 订阅',
    username: '账号',
    password: '密码',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    signIn: '登录',
    signingIn: '登录中…',
    authErrors: {
      INVALID_CREDENTIALS: '账号或密码不正确，请重试',
      RATE_LIMITED: '尝试次数过多，请稍后重试',
      FORBIDDEN: '登录验证已失效，请重新提交',
      PROTOCOL_ERROR: '登录响应异常，请联系管理员',
      NETWORK_ERROR: '连接失败，请检查网络后重试',
      SERVER_ERROR: '登录服务异常，请稍后重试',
    },
  },
  en: {
    locale: 'en',
    languageLabel: 'EN',
    languageName: 'English',
    languageSwitch: 'Language',
    brandSection: 'About Magpie',
    headline: ['Every ', 'agent’s model. One place.'],
    intro: [
      'One local gateway serves them all,',
      'and when a quota runs out, it quietly moves on to the next account.',
    ],
    features: ['Multi-account', 'Smart routing', 'Works out of the box'],
    welcome: 'Welcome back',
    subtitle: 'Sign in to Magpie to manage all your AI subscriptions',
    username: 'Username',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    authErrors: {
      INVALID_CREDENTIALS: 'Incorrect username or password. Try again.',
      RATE_LIMITED: 'Too many attempts. Please try again later.',
      FORBIDDEN: 'Verification expired. Please submit again.',
      PROTOCOL_ERROR: 'Unexpected login response. Contact your administrator.',
      NETWORK_ERROR: 'Connection failed. Check your network and retry.',
      SERVER_ERROR: 'Login service unavailable. Please retry later.',
    },
  },
}

const storageKey = 'magpie-language'

function isLanguage(value: unknown): value is Language {
  return languages.includes(value as Language)
}

/** A saved choice wins; otherwise follow the browser, using English for non-Chinese browsers. */
export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(storageKey)
    if (isLanguage(saved)) return saved
  } catch {
    // Storage can be blocked, e.g. in sandboxed previews; fall back to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function saveLanguage(language: Language) {
  try {
    localStorage.setItem(storageKey, language)
  } catch {
    // Without storage the choice only lasts for this visit.
  }
}
