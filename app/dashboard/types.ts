export type ProjectStatus = 
  | 'UPLOADED' 
  | 'PREPPED' 
  | 'AI_MIX_OK' 
  | 'TWEAKING' 
  | 'MASTERING' 
  | 'REVIEW' 
  | 'DONE' 
  | 'ARCHIVED'

export type FilterType = 'all' | 'working' | 'ai_ok' | 'completed' | 'archived'

export interface Project {
  id: string
  title: string
  status: ProjectStatus
  plan: 'Light' | 'Standard' | 'Creator'
  createdAt: string
  updatedAt: string
  expiresAt: string
  remainingDays: number
  isNearExpiration: boolean
  isExpired: boolean
  hasRemixSession?: boolean
  remixSessionRemainingHours?: number
  checkpoints?: {
    prepped?: string
    aiOk?: string
    done?: string
  }
  thumbnailUrl?: string
  progress: number
}

export interface RemixSession {
  id: string
  projectId: string
  startedAt: string
  expiresAt: string
  charged: boolean
}