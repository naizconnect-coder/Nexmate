export interface PermissionRecord {
  id: number
  permKey: string
  name: string
  module: string
  description: string | null
}

export interface RoleRecord {
  id: number
  name: string
  slug: string
  description: string | null
  isSystem: boolean
  permissionIds: number[]
  userCount: number
}

export interface UserRecord {
  id: number
  entraOid: string
  email: string | null
  fullName: string
  staffId: string | null
  department: string | null
  jobTitle: string | null
  roleIds: number[]
  roleNames: string[]
  createdAt: string
  updatedAt: string
}

export interface DepartmentSettingsRecord {
  id: number
  name: string
  userCount: number
  createdAt: string
  updatedAt: string
}
