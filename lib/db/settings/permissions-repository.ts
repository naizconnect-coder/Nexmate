import { COLLECTIONS, col } from "@/lib/db/mongodb"
import type { PermissionRecord } from "@/lib/db/settings/types"

export interface PermissionDoc {
  _id: number
  perm_key: string
  name: string
  module: string
  description: string | null
  created_at?: Date
}

export async function listPermissions(): Promise<PermissionRecord[]> {
  const permissions = await col<PermissionDoc>(COLLECTIONS.permissions)
  const rows = await permissions.find({}).sort({ module: 1, perm_key: 1 }).toArray()

  return rows.map((row) => ({
    id: row._id,
    permKey: row.perm_key,
    name: row.name,
    module: row.module,
    description: row.description,
  }))
}
