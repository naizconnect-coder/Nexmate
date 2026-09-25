import type { PaginationParams } from "@/lib/api/pagination"
import { toPaginatedResult } from "@/lib/api/pagination"
import type { PaginatedResult } from "@/lib/api/pagination"
import type { RoleRecord } from "@/lib/db/settings/types"
import {
  COLLECTIONS,
  col,
  contains,
  duplicateErrorMessage,
  nextId,
  notDeleted,
  now,
  uniquePositiveIds,
  withTransaction,
} from "@/lib/db/mongodb"

export interface RoleDoc {
  _id: number
  name: string
  slug: string
  description: string | null
  is_system: number
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

interface RolePermissionDoc {
  role_id: number
  permission_id: number
  created_at: Date
}

interface UserRoleDoc {
  user_id: number
  role_id: number
}

function mapRole(row: RoleDoc, permissionIds: number[], userCount: number): RoleRecord {
  return {
    id: row._id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isSystem: row.is_system === 1,
    permissionIds,
    userCount,
  }
}

async function getPermissionIdsForRole(roleId: number): Promise<number[]> {
  const links = await col<RolePermissionDoc>(COLLECTIONS.rolePermissions)
  const rows = await links.find({ role_id: roleId }).toArray()
  return rows.map((row) => Number(row.permission_id))
}

async function getUserCountsByRole(roleIds: number[]): Promise<Map<number, number>> {
  const counts = new Map<number, number>(roleIds.map((id) => [id, 0]))
  if (roleIds.length === 0) return counts

  const userRoles = await col<UserRoleDoc>(COLLECTIONS.userRoles)
  const rows = await userRoles
    .aggregate<{ _id: number; count: number }>([
      { $match: { role_id: { $in: roleIds } } },
      { $group: { _id: "$role_id", count: { $sum: 1 } } },
    ])
    .toArray()

  for (const row of rows) {
    counts.set(row._id, row.count)
  }
  return counts
}

export async function listRolesPaginated(
  params: PaginationParams
): Promise<PaginatedResult<RoleRecord>> {
  const roles = await col<RoleDoc>(COLLECTIONS.roles)
  const filter = params.search
    ? {
        ...notDeleted<RoleDoc>(),
        $or: [
          { name: contains(params.search) },
          { slug: contains(params.search) },
          { description: contains(params.search) },
        ],
      }
    : notDeleted<RoleDoc>()

  const total = await roles.countDocuments(filter)
  const rows = await roles
    .find(filter)
    .sort({ is_system: -1, name: 1 })
    .skip(params.offset)
    .limit(params.pageSize)
    .toArray()

  const roleIds = rows.map((row) => row._id)
  const userCounts = await getUserCountsByRole(roleIds)
  const permissionLinks = await col<RolePermissionDoc>(COLLECTIONS.rolePermissions)
  const allPermissions =
    roleIds.length > 0
      ? await permissionLinks.find({ role_id: { $in: roleIds } }).toArray()
      : []
  const permissionsByRole = new Map<number, number[]>()
  for (const link of allPermissions) {
    const list = permissionsByRole.get(link.role_id) ?? []
    list.push(link.permission_id)
    permissionsByRole.set(link.role_id, list)
  }

  const items = rows.map((row) =>
    mapRole(
      row,
      permissionsByRole.get(row._id) ?? [],
      userCounts.get(row._id) ?? 0
    )
  )

  return toPaginatedResult(items, total, params.page, params.pageSize)
}

export async function getRoleById(id: number): Promise<RoleRecord | null> {
  const roles = await col<RoleDoc>(COLLECTIONS.roles)
  const row = await roles.findOne({ _id: id, ...notDeleted<RoleDoc>() })
  if (!row) return null
  const [permissionIds, userCounts] = await Promise.all([
    getPermissionIdsForRole(id),
    getUserCountsByRole([id]),
  ])
  return mapRole(row, permissionIds, userCounts.get(id) ?? 0)
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}

export async function createRole(input: {
  name: string
  description?: string | null
  permissionIds: number[]
}): Promise<RoleRecord> {
  const name = input.name.trim()
  const slug = slugify(name)
  if (!name || !slug) {
    throw new Error("Role name is required")
  }

  try {
    const roleId = await withTransaction(async (session) => {
      const id = await nextId(COLLECTIONS.roles, session)
      const timestamp = now()
      const roles = await col<RoleDoc>(COLLECTIONS.roles)
      await roles.insertOne(
        {
          _id: id,
          name,
          slug,
          description: input.description?.trim() || null,
          is_system: 0,
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
        },
        { session }
      )

      if (input.permissionIds.length > 0) {
        const links = await col<RolePermissionDoc>(COLLECTIONS.rolePermissions)
        await links.insertMany(
          uniquePositiveIds(input.permissionIds).map((permissionId) => ({
            role_id: id,
            permission_id: permissionId,
            created_at: timestamp,
          })),
          { session }
        )
      }

      return id
    })

    const role = await getRoleById(roleId)
    if (!role) throw new Error("Role not found after create")
    return role
  } catch (error) {
    throw duplicateErrorMessage(error, "Duplicate role name or slug")
  }
}

export async function updateRole(
  id: number,
  input: {
    name?: string
    description?: string | null
    permissionIds?: number[]
  }
): Promise<RoleRecord | null> {
  const existing = await getRoleById(id)
  if (!existing) return null

  try {
    await withTransaction(async (session) => {
      const roles = await col<RoleDoc>(COLLECTIONS.roles)

      if (input.name !== undefined || input.description !== undefined) {
        const name = input.name?.trim() ?? existing.name
        const slug = existing.isSystem ? existing.slug : slugify(name)
        await roles.updateOne(
          { _id: id, ...notDeleted<RoleDoc>() },
          {
            $set: {
              name,
              slug,
              description: input.description?.trim() ?? existing.description,
              updated_at: now(),
            },
          },
          { session }
        )
      }

      if (input.permissionIds !== undefined) {
        const links = await col<RolePermissionDoc>(COLLECTIONS.rolePermissions)
        await links.deleteMany({ role_id: id }, { session })
        if (input.permissionIds.length > 0) {
          const timestamp = now()
          await links.insertMany(
            uniquePositiveIds(input.permissionIds).map((permissionId) => ({
              role_id: id,
              permission_id: permissionId,
              created_at: timestamp,
            })),
            { session }
          )
        }
      }
    })
  } catch (error) {
    throw duplicateErrorMessage(error, "Duplicate role name or slug")
  }

  return getRoleById(id)
}

export async function deleteRole(id: number): Promise<boolean> {
  const existing = await getRoleById(id)
  if (!existing) return false
  if (existing.isSystem) {
    throw new Error("System roles cannot be deleted")
  }

  const roles = await col<RoleDoc>(COLLECTIONS.roles)
  const result = await roles.updateOne(
    { _id: id, ...notDeleted<RoleDoc>() },
    { $set: { deleted_at: now(), updated_at: now() } }
  )
  return result.modifiedCount > 0
}
