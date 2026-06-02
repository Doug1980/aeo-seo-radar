import { describe, it, expect } from 'vitest'
import { app } from '../index.js'

describe('POST /api/v1/audits', () => {
  it('deve criar auditoria com URL válida', async () => {
    const res = await app.request('/api/v1/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'https://example.com' }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data.domain).toBe('https://example.com')
    expect(body.data.status).toBe('pending')
    expect(body.data.id).toBeDefined()
  })

  it('deve retornar 400 com URL inválida', async () => {
    const res = await app.request('/api/v1/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'nao-e-uma-url' }),
    })
    expect(res.status).toBe(400)
  })

  it('deve retornar 400 sem body', async () => {
    const res = await app.request('/api/v1/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })
})