import { describe, it, expect } from 'vitest'
import { app } from '../index.js'

describe('POST /api/v1/audits', () => {
  it('deve retornar 404 para id inexistente', async () => {
  // UUID válido no formato, mas que não existe no banco
  const res = await app.request('/api/v1/audits/00000000-0000-0000-0000-000000000000')
  const body = await res.json()

  expect(res.status).toBe(404)
  expect(body.error).toBeDefined()
  expect(body.code).toBe('NOT_FOUND')
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

describe('GET /api/v1/audits', () => {
  it('deve retornar lista de auditorias', async () => {
    const res = await app.request('/api/v1/audits')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('cada auditoria deve conter os campos obrigatórios', async () => {
    // Cria uma auditoria para garantir que a lista não está vazia
    await app.request('/api/v1/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'https://example.com' }),
    })

    const res = await app.request('/api/v1/audits')
    const body = await res.json()

    expect(body.data.length).toBeGreaterThan(0)

    const audit = body.data[0]
    expect(audit.id).toBeDefined()
    expect(audit.domain).toBeDefined()
    expect(audit.status).toBeDefined()
    expect(audit.createdAt).toBeDefined()
    expect(audit.scores).toBeDefined()
    expect(audit.recommendations).toBeDefined() // campo que estava faltando antes
  })

  it('deve retornar no máximo 20 auditorias', async () => {
    const res = await app.request('/api/v1/audits')
    const body = await res.json()

    expect(body.data.length).toBeLessThanOrEqual(20)
  })
})

describe('GET /api/v1/audits/:id', () => {
  it('deve retornar auditoria existente com todos os campos', async () => {
    // Cria uma auditoria para ter um id válido
    const created = await app.request('/api/v1/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: 'https://example.com' }),
    })
    const createdBody = await created.json()
    const id = createdBody.data.id

    const res = await app.request(`/api/v1/audits/${id}`)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.id).toBe(id)
    expect(body.data.domain).toBe('https://example.com')
    expect(body.data.status).toBeDefined()
    expect(body.data.createdAt).toBeDefined()
    expect(body.data.scores).toBeDefined()
    expect(body.data.recommendations).toBeDefined() // campo que estava faltando antes
  })

  it('deve retornar 404 para id inexistente', async () => {
    const res = await app.request('/api/v1/audits/id-que-nao-existe')
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBeDefined()
    expect(body.code).toBe('NOT_FOUND')
  })
})
