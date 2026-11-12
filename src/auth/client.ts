export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'RATE_LIMITED' | 'FORBIDDEN' |
  'PROTOCOL_ERROR' | 'NETWORK_ERROR' | 'SERVER_ERROR'

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code)
    this.name = 'AuthError'
  }
}

type Request = (url: string, options?: RequestInit) => Promise<Response>
type Credentials = { username: string; password: string; next: string }

function safeDestination(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return false
  let decoded: string
  try { decoded = decodeURIComponent(value) } catch { return false }
  return !/[\\\u0000-\u0020\u007f]/.test(decoded) && !decoded.startsWith('//') &&
    !/^\/(login|logout|api\/v1\/auth)([/?#]|$)/.test(decoded)
}

async function json(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) {
    if (response.status === 401) throw new AuthError('INVALID_CREDENTIALS')
    if (response.status === 429) throw new AuthError('RATE_LIMITED')
    if (response.status === 403) throw new AuthError('FORBIDDEN')
    throw new AuthError('SERVER_ERROR')
  }
  const value: unknown = await response.json().catch(() => { throw new AuthError('PROTOCOL_ERROR') })
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AuthError('PROTOCOL_ERROR')
  return value as Record<string, unknown>
}

export async function signIn(input: Credentials, request: Request = fetch): Promise<string> {
  try {
    const csrf = await json(await request('/api/v1/auth/csrf', {
      credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15_000),
    }))
    if (typeof csrf.csrfToken !== 'string' || !csrf.csrfToken) throw new AuthError('PROTOCOL_ERROR')
    const response = await request('/api/v1/auth/sessions', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      // 静态部署：没有 Node 后端读取请求体，凭据改由请求头交给 Nginx 校验。
      // 格式为 "用户名:密码"，与 .env 的 MAGPIE_LOGIN_USER / MAGPIE_LOGIN_PASSWORD 对应。
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf.csrfToken,
        'X-Magpie-Login': `${input.username}:${input.password}`,
      },
      body: JSON.stringify({ ...input, csrf: csrf.csrfToken }), signal: AbortSignal.timeout(15_000),
    })
    const result = await json(response)
    if (response.status !== 201 || !safeDestination(result.redirectTo)) throw new AuthError('PROTOCOL_ERROR')
    return result.redirectTo
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new AuthError('NETWORK_ERROR')
  }
}
