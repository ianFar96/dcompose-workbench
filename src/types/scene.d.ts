export type Service = {
  id: string
  label: string
  type: string
}

export type ServiceRelationship = {
  source: string
  target: string
}

export type Scene = {
  services: Service[]
  relationships: ServiceRelationship[]
}
