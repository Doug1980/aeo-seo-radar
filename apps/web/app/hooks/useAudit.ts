import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { DomainAudit, ApiResponse } from '@aeo-seo-radar/shared'

// Interface para aceitar configurações opcionais do TanStack Query no histórico
interface UseAuditHistoryOptions {
  refetchInterval?: number | false | ((query: any) => number | false)
}

export function useAuditHistory(options?: UseAuditHistoryOptions) {
  return useQuery<DomainAudit[]>({
    queryKey: ['audit-history'],
    queryFn: async () => {
      const res = await fetch('http://localhost:3001/api/v1/audits')
      if (!res.ok) throw new Error('Erro ao buscar histórico')
      const body = await res.json()
      return body.data
    },
    // Injeta as opções reativas vindo do componente (como o pooling automático)
    ...options,
  })
}

export function useCreateAudit() {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse<DomainAudit>, Error, string>({
    mutationFn: async (domain: string) => {
      const res = await fetch('http://localhost:3001/api/v1/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      if (!res.ok) throw new Error('Falha ao iniciar auditoria')
      return res.json()
    },
    onSuccess: () => {
      // Invalida o cache para forçar o histórico a atualizar assim que uma nova auditoria for criada
      queryClient.invalidateQueries({ queryKey: ['audit-history'] })
    },
  })
}