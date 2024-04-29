import type { DependsOnCondition } from './docker';

export type Service = {
  id: string
  label: string
  type: string
  dependsOn: Record<string, ServiceDependency>
}

export type ServiceDependency = {
  condition: DependsOnCondition
}

export type Scene = {
  services: Service[]
}
