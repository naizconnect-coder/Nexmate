import {
  COLLECTIONS,
  col,
  getDb,
  isDuplicateKeyError,
  nextId,
  now,
} from "@/lib/db/mongodb"

interface PermissionDoc {
  _id: number
  perm_key: string
  name: string
  module: string
  description: string | null
  created_at?: Date
}

interface RoleDoc {
  _id: number
  slug: string
  deleted_at?: Date | null
}

interface RolePermissionDoc {
  role_id: number
  permission_id: number
  created_at: Date
}

export const DEPARTMENT_PERMISSIONS = [
  {
    permKey: "settings.departments.read",
    name: "View departments",
    description: "List and view organization departments",
  },
  {
    permKey: "settings.departments.write",
    name: "Manage departments",
    description: "Create, update, and delete departments",
  },
] as const

const SYSTEM_ADMIN_SLUG = "system_admin"
const MANAGER_SLUG = "manager"

let ensured = false

async function allocatePermissionId(): Promise<number> {
  const permissions = await col<PermissionDoc>(COLLECTIONS.permissions)
  const last = await permissions.find().sort({ _id: -1 }).limit(1).next()
  const maxId = typeof last?._id === "number" ? last._id : 0
  const database = await getDb()
  const counters = database.collection<{ _id: string; seq: number }>(COLLECTIONS.counters)
  const current = await counters.findOne({ _id: COLLECTIONS.permissions })
  const seq = Math.max(current?.seq ?? 0, maxId)
  await counters.updateOne(
    { _id: COLLECTIONS.permissions },
    { $set: { seq } },
    { upsert: true }
  )
  return nextId(COLLECTIONS.permissions)
}

export async function ensureDepartmentsPermissions(): Promise<void> {
  if (ensured) return

  const permissions = await col<PermissionDoc>(COLLECTIONS.permissions)
  const roles = await col<RoleDoc>(COLLECTIONS.roles)
  const rolePermissions = await col<RolePermissionDoc>(COLLECTIONS.rolePermissions)

  const existing = await permissions
    .find({ perm_key: { $in: DEPARTMENT_PERMISSIONS.map((item) => item.permKey) } })
    .toArray()
  const byKey = new Map(existing.map((row) => [row.perm_key, row]))

  for (const spec of DEPARTMENT_PERMISSIONS) {
    if (byKey.has(spec.permKey)) continue
    const id = await allocatePermissionId()
    const doc: PermissionDoc = {
      _id: id,
      perm_key: spec.permKey,
      name: spec.name,
      module: "settings",
      description: spec.description,
      created_at: now(),
    }
    try {
      await permissions.insertOne(doc)
      byKey.set(spec.permKey, doc)
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error
      const existingDoc = await permissions.findOne({ perm_key: spec.permKey })
      if (existingDoc) byKey.set(spec.permKey, existingDoc)
    }
  }

  const grantRoles = await roles
    .find({ slug: { $in: [SYSTEM_ADMIN_SLUG, MANAGER_SLUG] } })
    .toArray()
    .then((rows) => rows.filter((role) => !role.deleted_at))

  const createdAt = now()
  for (const role of grantRoles) {
    for (const spec of DEPARTMENT_PERMISSIONS) {
      const permission = byKey.get(spec.permKey)
      if (!permission) continue
      await rolePermissions.updateOne(
        { role_id: role._id, permission_id: permission._id },
        {
          $setOnInsert: {
            role_id: role._id,
            permission_id: permission._id,
            created_at: createdAt,
          },
        },
        { upsert: true }
      )
    }
  }

  ensured = true
}
