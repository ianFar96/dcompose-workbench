export type ServiceStatus = 'paused' | 'running' | 'loading' | 'error' | 'unknown'
export type StatusEventPayload = {
  status: ServiceStatus
  message?: string
}
