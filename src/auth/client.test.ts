import assert from 'node:assert/strict'
import test from 'node:test'
import { signIn, AuthError } from './client.js'

test('gets CSRF then sends credentials once; uses same-origin cookie semantics', async () => {
  const calls: {url: string; options?: RequestInit}[] = []
  const request = async (url: string, options?: RequestInit) => {
    calls.push({url, options})
    return calls.length === 1
      ? Response.json({csrfToken: 'synthetic-csrf'})
      : Response.json({redirectTo: '/?view=providers'}, {status: 201})
  }
  assert.equal(await signIn({username: 'test', password: 'synthetic', next: '/?view=providers'}, request), '/?view=providers')
  assert.equal(calls.length, 2)
  assert.equal(calls[0].url, '/api/v1/auth/csrf')
  assert.equal(calls[1].options?.credentials, 'same-origin')
  assert.deepEqual(JSON.parse(calls[1].options?.body as string), {
    username: 'test', password: 'synthetic', next: '/?view=providers', csrf: 'synthetic-csrf',
  })
})

test('reports invalid credentials without echoing upstream messages', async () => {
  let count = 0
  await assert.rejects(signIn({username: 'test', password: 'wrong', next: '/'}, async () =>
    ++count === 1 ? Response.json({csrfToken: 'synthetic'}) : Response.json({error: {code: 'INVALID_CREDENTIALS', message: 'do not echo'}}, {status: 401})),
    (error: unknown) => error instanceof AuthError && error.code === 'INVALID_CREDENTIALS' && !error.message.includes('do not echo'))
})

test('fails visibly when CSRF endpoint has unexpected shape; never sends credentials', async () => {
  let calls = 0
  await assert.rejects(signIn({username: 'test', password: 'synthetic', next: '/'}, async () => {
    calls++
    return Response.json({})
  }), (error: unknown) => error instanceof AuthError && error.code === 'PROTOCOL_ERROR')
  assert.equal(calls, 1)
})

test('rejects unsafe redirects even if server sends them', async () => {
  for (const redirectTo of ['https://evil.invalid', '//evil.invalid', '/\\evil.invalid', '/login', '/%2f%2fevil.invalid']) {
    let calls = 0
    await assert.rejects(signIn({username: 'test', password: 'synthetic', next: '/'}, async () =>
      ++calls === 1 ? Response.json({csrfToken: 'synthetic'}) : Response.json({redirectTo}, {status: 201})))
  }
})

test('network errors become an explicit recoverable error', async () => {
  await assert.rejects(signIn({username: 'test', password: 'synthetic', next: '/'}, async () => {
    throw new TypeError('network details should not be shown')
  }), (error: unknown) => error instanceof AuthError && error.code === 'NETWORK_ERROR')
})
