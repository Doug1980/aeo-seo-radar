'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import type { ApiResponse, DomainAudit } from '@aeo-seo-radar/shared'

async function createAudit(domain: string): Promise<ApiResponse<DomainAudit>> {
  const res = await fetch('http://localhost:3001/api/v1/audits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error ?? 'Erro ao criar auditoria')
  }

  return res.json()
}

export function useCreateAudit() {
  return useMutation({
    mutationFn: createAudit,
  })
}

export function useAuditHistory() {
  return useQuery({
    queryKey: ['audits'],
    queryFn: async (): Promise<DomainAudit[]> => {
      const res = await fetch('http://localhost:3001/api/v1/audits')
      const body = await res.json()
      return body.data
    },
    refetchInterval: false,
  })
}