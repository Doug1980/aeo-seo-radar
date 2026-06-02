import { Hono } from 'hono'

export const healthRoutes = new Hono()

healthRoutes.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'AEO & SEO Radar API',
    timestamp: new Date().toISOString(),
  })
})