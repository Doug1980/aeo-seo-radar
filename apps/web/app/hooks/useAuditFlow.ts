import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuditHistory, useAuditById, useCreateAudit } from './useAudit'
import type { DomainAudit } from '@aeo-seo-radar/shared'

interface UseAuditFlowReturn {
  currentAudit: DomainAudit | undefined
  history: DomainAudit[] | undefined
  isPolling: boolean
  isPending: boolean
  error: Error | null
  selectedAuditId: string | null
  selectAudit: (id: string) => void
  startAudit: (url: string) => void
}

export function useAuditFlow(): UseAuditFlowReturn {
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const queryClient = useQueryClient()
  const { data: history } = useAuditHistory()
  const { mutate, isPending, error } = useCreateAudit()

  const activeId = selectedAuditId || history?.[0]?.id || null

  const { data: currentAudit } = useAuditById(activeId, isPolling, () => {
    setIsPolling(false)
    queryClient.invalidateQueries({ queryKey: ['audit-history'] })
  })

  function startAudit(url: string) {
    if (!url) return
    mutate(url, {
      onSuccess: (res) => {
        setSelectedAuditId(res.data.id)
        setIsPolling(true)
      },
    })
  }

  function selectAudit(id: string) {
    setSelectedAuditId(id)
  }

  return {
    currentAudit,
    history,
    isPolling,
    isPending,
    error,
    selectedAuditId: activeId,
    selectAudit,
    startAudit,
  }
}