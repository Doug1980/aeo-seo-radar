import { describe, it, expect } from 'vitest'
import { app } from '../index.js'

describe('GET /health', () => {
  it('deve retornar status ok', async () => {
    const res = await app.request('/health')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.service).toBe('AEO & SEO Radar API')
    expect(body.timestamp).toBeDefined()
  })
})