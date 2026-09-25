import type { PaginationParams, PaginatedResult } from "@/lib/api/pagination"
import { toPaginatedResult } from "@/lib/api/pagination"
import { formatDateTime } from "@/lib/db/format-datetime"
import type { DepartmentSettingsRecord } from "@/lib/db/settings/types"
import {
  COLLECTIONS,
  col,
  contains,
  duplicateErrorMessage,
  escapeRegex,
  nextId,
  notDeleted,
  now,
} from "@/lib/db/mongodb"

export interface DepartmentRecord {
  id: number
  name: string
}

export interface DepartmentDoc {
  _id: number
  name: string
  created_at: Date
  updated_at: Date
}

interface UserDepartmentDoc {
  department: string | null
  deleted_at: Date | null
}

function normalizeDepartmentName(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > 128 ? trimmed.slice(0, 128) : trimmed
}

function exactNameFilter(name: string) {
  return {
    name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
  }
}

function mapDepartment(row: DepartmentDoc, userCount: number): DepartmentSettingsRecord {
  return {
    id: Number(row._id),
    name: String(row.name),
    userCount,
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at),
  }
}

async function getUserCountsByName(names: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (names.length === 0) return counts

  const users = await col<UserDepartmentDoc>(COLLECTIONS.users)
  const rows = await users
    .aggregate<{ _id: string; count: number }>([
      {
        $match: {
          ...notDeleted<UserDepartmentDoc>(),
          department: { $in: names },
        },
      },
      { $group: { _id: "$department", count: { $sum: 1 } } },
    ])
    .toArray()

  for (const row of rows) {
    if (row._id) counts.set(row._id, row.count)
  }
  return counts
}

async function findDepartmentByName(
  name: string,
  excludeId?: number
): Promise<DepartmentDoc | null> {
  const departments = await col<DepartmentDoc>(COLLECTIONS.departments)
  const filter =
    excludeId !== undefined
      ? { ...exactNameFilter(name), _id: { $ne: excludeId } }
      : exactNameFilter(name)
  return departments.findOne(filter)
}

/** Inserts the department into departments when it is not already stored. */
export async function ensureDepartmentExists(
  name: string | null | undefined
): Promise<void> {
  const departmentName = normalizeDepartmentName(name)
  if (!departmentName) return

  try {
    const existing = await findDepartmentByName(departmentName)
    if (existing) return

    const timestamp = now()
    const departments = await col<DepartmentDoc>(COLLECTIONS.departments)
    await departments.insertOne({
      _id: await nextId(COLLECTIONS.departments),
      name: departmentName,
      created_at: timestamp,
      updated_at: timestamp,
    })
  } catch (error) {
    if (isMissingCollectionError(error)) return
    const existing = await findDepartmentByName(departmentName)
    if (existing) return
    throw error
  }
}

export async function listDepartments(): Promise<DepartmentRecord[]> {
  try {
    const departments = await col<DepartmentDoc>(COLLECTIONS.departments)
    const rows = await departments.find({}).sort({ name: 1 }).toArray()
    return rows.map((row) => ({
      id: Number(row._id),
      name: String(row.name),
    }))
  } catch (error) {
    if (isMissingCollectionError(error)) return []
    throw error
  }
}

export async function listDepartmentsPaginated(
  params: PaginationParams
): Promise<PaginatedResult<DepartmentSettingsRecord>> {
  const departments = await col<DepartmentDoc>(COLLECTIONS.departments)
  const filter = params.search ? { name: contains(params.search) } : {}

  const total = await departments.countDocuments(filter)
  const rows = await departments
    .find(filter)
    .sort({ name: 1 })
    .skip(params.offset)
    .limit(params.pageSize)
    .toArray()

  const userCounts = await getUserCountsByName(rows.map((row) => row.name))

  const items = rows.map((row) =>
    mapDepartment(row, userCounts.get(row.name) ?? 0)
  )

  return toPaginatedResult(items, total, params.page, params.pageSize)
}

export async function getDepartmentById(
  id: number
): Promise<DepartmentSettingsRecord | null> {
  const departments = await col<DepartmentDoc>(COLLECTIONS.departments)
  const row = await departments.findOne({ _id: id })
  if (!row) return null

  const userCounts = await getUserCountsByName([row.name])
  return mapDepartment(row, userCounts.get(row.name) ?? 0)
}

export async function createDepartment(name: string): Promise<DepartmentSettingsRecord> {
  const departmentName = normalizeDepartmentName(name)
  if (!departmentName) {
    throw new Error("Department name is required")
  }

  const existing = await findDepartmentByName(departmentName)
  if (existing) {
    throw new Error("A department with this name already exists")
  }

  try {
    const timestamp = now()
    const id = await nextId(COLLECTIONS.departments)
    const departments = await col<DepartmentDoc>(COLLECTIONS.departments)
    await departments.insertOne({
      _id: id,
      name: departmentName,
      created_at: timestamp,
      updated_at: timestamp,
    })

    const created = await getDepartmentById(id)
    if (!created) throw new Error("Department not found after create")
    return created
  } catch (error) {
    throw duplicateErrorMessage(error, "A department with this name already exists")
  }
}

export async function updateDepartment(
  id: number,
  name: string
): Promise<DepartmentSettingsRecord | null> {
  const departmentName = normalizeDepartmentName(name)
  if (!departmentName) {
    throw new Error("Department name is required")
  }

  const departments = await col<DepartmentDoc>(COLLECTIONS.departments)
  const existing = await departments.findOne({ _id: id })
  if (!existing) return null

  const duplicate = await findDepartmentByName(departmentName, id)
  if (duplicate) {
    throw new Error("A department with this name already exists")
  }

  try {
    await departments.updateOne(
      { _id: id },
      { $set: { name: departmentName, updated_at: now() } }
    )
  } catch (error) {
    throw duplicateErrorMessage(error, "A department with this name already exists")
  }

  if (existing.name !== departmentName) {
    const users = await col<UserDepartmentDoc>(COLLECTIONS.users)
    await users.updateMany(
      {
        ...notDeleted<UserDepartmentDoc>(),
        department: existing.name,
      },
      { $set: { department: departmentName } }
    )
  }

  return getDepartmentById(id)
}

export async function deleteDepartment(id: number): Promise<boolean> {
  const department = await getDepartmentById(id)
  if (!department) return false

  if (department.userCount > 0) {
    throw new Error(
      "Cannot delete this department because users are assigned to it"
    )
  }

  const departments = await col<DepartmentDoc>(COLLECTIONS.departments)
  const result = await departments.deleteOne({ _id: id })
  return result.deletedCount > 0
}

export async function validateDepartmentIds(ids: number[]): Promise<void> {
  const uniqueIds = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))]
  if (uniqueIds.length === 0) return

  const departments = await listDepartments()
  const validIds = new Set(departments.map((department) => department.id))
  for (const id of uniqueIds) {
    if (!validIds.has(id)) {
      throw new Error("One or more selected departments are invalid")
    }
  }
}

function isMissingCollectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /ns not found|collection.*not found/i.test(message)
}
