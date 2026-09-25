import { formatDateTime } from "@/lib/db/format-datetime"
import type { PaginationParams, PaginatedResult } from "@/lib/api/pagination"
import { toPaginatedResult } from "@/lib/api/pagination"
import type { UserRecord } from "@/lib/db/settings/types"
import type { RoleDoc } from "@/lib/db/settings/roles-repository"
import { ensureDepartmentExists } from "@/lib/db/departments"
import type { UserDoc } from "@/lib/db/users"
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

interface UserRoleDoc {
  user_id: number
  role_id: number
  created_at: Date
}

function mapUser(
  row: UserDoc,
  roleIds: number[],
  roleNames: string[]
): UserRecord {
  return {
    id: row._id,
    entraOid: row.entra_oid,
    email: row.email,
    fullName: row.full_name,
    staffId: row.staff_id,
    department: row.department,
    jobTitle: row.job_title,
    roleIds,
    roleNames,
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at),
  }
}

async function loadRolesForUsers(
  userIds: number[]
): Promise<Map<number, { ids: number[]; names: string[] }>> {
  const result = new Map<number, { ids: number[]; names: string[] }>()
  for (const userId of userIds) {
    result.set(userId, { ids: [], names: [] })
  }
  if (userIds.length === 0) return result

  const userRoles = await col<UserRoleDoc>(COLLECTIONS.userRoles)
  const links = await userRoles.find({ user_id: { $in: userIds } }).toArray()
  const roleIds = uniquePositiveIds(links.map((link) => link.role_id))
  if (roleIds.length === 0) return result

  const roles = await col<RoleDoc>(COLLECTIONS.roles)
  const roleRows = await roles
    .find({ _id: { $in: roleIds }, ...notDeleted<RoleDoc>() })
    .toArray()
  const roleById = new Map(roleRows.map((role) => [role._id, role]))

  for (const link of links) {
    const role = roleById.get(link.role_id)
    if (!role) continue
    const entry = result.get(link.user_id)
    if (!entry) continue
    entry.ids.push(role._id)
    entry.names.push(role.name)
  }

  return result
}

export async function listUsersPaginated(
  params: PaginationParams
): Promise<PaginatedResult<UserRecord>> {
  const users = await col<UserDoc>(COLLECTIONS.users)
  const filter = params.search
    ? {
        ...notDeleted<UserDoc>(),
        $or: [
          { full_name: contains(params.search) },
          { email: contains(params.search) },
          { staff_id: contains(params.search) },
          { department: contains(params.search) },
        ],
      }
    : notDeleted<UserDoc>()

  const total = await users.countDocuments(filter)
  const rows = await users
    .find(filter)
    .sort({ full_name: 1 })
    .skip(params.offset)
    .limit(params.pageSize)
    .toArray()

  const rolesByUser = await loadRolesForUsers(rows.map((row) => row._id))
  const items = rows.map((row) => {
    const roles = rolesByUser.get(row._id) ?? { ids: [], names: [] }
    return mapUser(row, roles.ids, roles.names)
  })

  return toPaginatedResult(items, total, params.page, params.pageSize)
}

export async function getUserById(id: number): Promise<UserRecord | null> {
  const users = await col<UserDoc>(COLLECTIONS.users)
  const row = await users.findOne({ _id: id, ...notDeleted<UserDoc>() })
  if (!row) return null
  const rolesByUser = await loadRolesForUsers([id])
  const roles = rolesByUser.get(id) ?? { ids: [], names: [] }
  return mapUser(row, roles.ids, roles.names)
}

export async function createUser(input: {
  entraOid: string
  email?: string | null
  fullName: string
  staffId?: string | null
  department?: string | null
  jobTitle?: string | null
  roleIds?: number[]
}): Promise<UserRecord> {
  await ensureDepartmentExists(input.department)
  try {
    const userId = await withTransaction(async (session) => {
      const id = await nextId(COLLECTIONS.users, session)
      const timestamp = now()
      const users = await col<UserDoc>(COLLECTIONS.users)
      await users.insertOne(
        {
          _id: id,
          entra_oid: input.entraOid.trim(),
          email: input.email?.trim() || null,
          id_card_number: null,
          staff_id: input.staffId?.trim() || null,
          full_name: input.fullName.trim() || "Unknown",
          dob: null,
          department: input.department?.trim() || null,
          job_title: input.jobTitle?.trim() || null,
          join_date: null,
          photo_path: null,
          created_at: timestamp,
          updated_at: timestamp,
          deleted_at: null,
        },
        { session }
      )

      if (input.roleIds?.length) {
        const userRoles = await col<UserRoleDoc>(COLLECTIONS.userRoles)
        await userRoles.insertMany(
          uniquePositiveIds(input.roleIds).map((roleId) => ({
            user_id: id,
            role_id: roleId,
            created_at: timestamp,
          })),
          { session }
        )
      }

      return id
    })

    const user = await getUserById(userId)
    if (!user) throw new Error("User not found after create")
    return user
  } catch (error) {
    throw duplicateErrorMessage(error, "Duplicate user")
  }
}

export async function updateUser(
  id: number,
  input: {
    email?: string | null
    fullName?: string
    staffId?: string | null
    department?: string | null
    jobTitle?: string | null
    roleIds?: number[]
  }
): Promise<UserRecord | null> {
  const existing = await getUserById(id)
  if (!existing) return null

  if (input.department !== undefined) {
    await ensureDepartmentExists(input.department)
  }

  try {
    await withTransaction(async (session) => {
      const users = await col<UserDoc>(COLLECTIONS.users)
      await users.updateOne(
        { _id: id, ...notDeleted<UserDoc>() },
        {
          $set: {
            email:
              input.email !== undefined ? input.email?.trim() || null : existing.email,
            full_name: input.fullName?.trim() ?? existing.fullName,
            staff_id:
              input.staffId !== undefined
                ? input.staffId?.trim() || null
                : existing.staffId,
            department:
              input.department !== undefined
                ? input.department?.trim() || null
                : existing.department,
            job_title:
              input.jobTitle !== undefined
                ? input.jobTitle?.trim() || null
                : existing.jobTitle,
            updated_at: now(),
          },
        },
        { session }
      )

      if (input.roleIds !== undefined) {
        const userRoles = await col<UserRoleDoc>(COLLECTIONS.userRoles)
        await userRoles.deleteMany({ user_id: id }, { session })
        if (input.roleIds.length > 0) {
          const timestamp = now()
          await userRoles.insertMany(
            uniquePositiveIds(input.roleIds).map((roleId) => ({
              user_id: id,
              role_id: roleId,
              created_at: timestamp,
            })),
            { session }
          )
        }
      }
    })
  } catch (error) {
    throw duplicateErrorMessage(error, "Duplicate user")
  }

  return getUserById(id)
}

export async function deleteUser(id: number): Promise<boolean> {
  const users = await col<UserDoc>(COLLECTIONS.users)
  const result = await users.updateOne(
    { _id: id, ...notDeleted<UserDoc>() },
    { $set: { deleted_at: now(), updated_at: now() } }
  )
  return result.modifiedCount > 0
}

export async function listRolesForSelect(): Promise<
  Array<{ id: number; name: string }>
> {
  const roles = await col<RoleDoc>(COLLECTIONS.roles)
  const rows = await roles
    .find(notDeleted<RoleDoc>())
    .sort({ name: 1 })
    .toArray()
  return rows.map((row) => ({ id: row._id, name: row.name }))
}
