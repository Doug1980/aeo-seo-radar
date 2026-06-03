'use client'

import { useState } from 'react'
import { useCreateAudit } from './hooks/useAudit'
import type { DomainAudit } from '@aeo-seo-radar/shared'

function ScoreColor(score: number) {
  if (score >= 90) return 'text-green-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [audit, setAudit] = useState<DomainAudit | null>(null)
  const [polling, setPolling] = useState(false)
  const { mutate, isPending, error } = useCreateAudit()

  function handleSubmit() {
    if (!url) return
    mutate(url, {
      onSuccess: (res) => {
        setAudit(res.data)
        if (res.data.status === 'running') {
          setPolling(true)
          pollAudit(res.data.id)
        }
      },
    })
  }

  async function pollAudit(id: string) {
  let attempts = 0
  const maxAttempts = 30 // 30 * 8s = 4 minutos

  const interval = setInterval(async () => {
    attempts++

    try {
      const res = await fetch(`http://localhost:3001/api/v1/audits/${id}`)
      const body = await res.json()
      const updated: DomainAudit = body.data

      setAudit(updated)

      if (updated.status === 'completed' || updated.status === 'failed') {
        clearInterval(interval)
        setPolling(false)
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval)
        setPolling(false)
      }
    } catch (err) {
      console.error('Polling error:', err)
    }
  }, 8000) // 8 segundos
}

  const scores = [
    { label: 'Score Geral', value: audit?.scores.overall },
    { label: 'SEO', value: audit?.scores.seo },
    { label: 'AEO', value: audit?.scores.aeo },
    { label: 'Performance', value: audit?.scores.performance },
  ]

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white">AEO & SEO Radar 📡</h1>
          <p className="text-gray-400 mt-1">Monitoramento e auditoria de presença digital</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-800">
          <h2 className="text-lg font-semibold mb-4">Nova Auditoria</h2>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://seusite.com.br"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSubmit}
              disabled={isPending || !url || polling}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isPending || polling ? 'Auditando...' : 'Auditar'}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error.message}</p>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {scores.map((card) => (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-center">
              <p className="text-gray-500 text-sm mb-1">{card.label}</p>
              <p className={`text-4xl font-bold ${card.value !== undefined && card.value > 0 ? ScoreColor(card.value) : 'text-gray-400'}`}>
                {card.value !== undefined ? card.value : '--'}
              </p>
            </div>
          ))}
        </div>

        {audit ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className={`font-semibold mb-3 ${audit.status === 'completed' ? 'text-green-400' : audit.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
              {audit.status === 'completed' ? '✅ Auditoria concluída' : audit.status === 'failed' ? '❌ Auditoria falhou' : '⏳ Auditando...'}
            </h3>
            <div className="text-sm text-gray-400 space-y-1">
              <p><span className="text-gray-300">Domínio:</span> {audit.domain}</p>
              <p><span className="text-gray-300">Status:</span> {audit.status}</p>
              <p><span className="text-gray-300">Criado em:</span> {new Date(audit.createdAt).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-500 text-lg">Insira uma URL acima para iniciar a auditoria</p>
          </div>
        )}
      </div>
    </main>
  )
}