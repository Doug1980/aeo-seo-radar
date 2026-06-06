import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { DomainAudit, ApiResponse } from '@aeo-seo-radar/shared'

const API = `${process.env.NEXT_PUBLIC_API_URL}/api/v1`

export function useAuditHistory() {
  return useQuery<DomainAudit[]>({
    queryKey: ['audit-history'],
    queryFn: async () => {
      const res = await fetch(`${API}/audits`)
      if (!res.ok) throw new Error('Erro ao buscar histórico')
      const body = await res.json()
      return body.data
    },
  })
}

export function useAuditById(
  id: string | null,
  enablePolling: boolean = false,
  onDone?: () => void
) {
  return useQuery<DomainAudit>({
    queryKey: ['audit', id],
    queryFn: async () => {
      const res = await fetch(`${API}/audits/${id}`)
      if (!res.ok) throw new Error('Erro ao buscar auditoria')
      const body = await res.json()
      const data: DomainAudit = body.data

     

      const isDone =
        (data.status === 'completed' && data.recommendations?.length > 0) ||
        data.status === 'failed'

  

      if (isDone) onDone?.()

      return data
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
    refetchInterval: enablePolling ? 5000 : false,
  })
}

export function useCreateAudit() {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse<DomainAudit>, Error, string>({
    mutationFn: async (domain: string) => {
      const res = await fetch(`${API}/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      if (!res.ok) throw new Error('Falha ao iniciar auditoria')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-history'] })
    },
  })
}