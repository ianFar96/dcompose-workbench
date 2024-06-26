import type { DependsOnCondition } from './docker';

export type ServiceStatus = 'paused' | 'running' | 'loading' | 'error' | 'unknown'
export type StatusEventPayload = {
  status: ServiceStatus
  message?: string
}

export type Service = {
  id: string
  label: string
  type?: string
  dependsOn: Record<string, ServiceDependency>
  sceneName: string
}

export type ServiceYaml = Record<string, unknown>

export type ServiceDependency = {
  condition: DependsOnCondition
}

export type ServiceAssets = {
  [key: string]: ServiceAssets | null
}
