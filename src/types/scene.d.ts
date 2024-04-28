export type Service = {
  id: string
  label: string
  type: string
  dependsOn: Record<string, ServiceDependency>
}

export type ServiceDependency = {
  condition: string
}

export type Scene = {
  services: Service[]
}
