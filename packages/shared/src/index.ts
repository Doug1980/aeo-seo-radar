export type AuditStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface DomainAudit {
  id: string
  domain: string
  status: AuditStatus
  createdAt: string
  completedAt?: string
  scores: AuditScores
}

export interface AuditScores {
  overall: number
  seo: number
  aeo: number
  performance: number
  schemaMarkup: number
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  code: string
}