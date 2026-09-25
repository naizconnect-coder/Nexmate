import { COLLECTIONS, col, contains, nextId, notDeleted, now, uniquePositiveIds } from "@/lib/db/mongodb"
import { ensureDepartmentExists, listDepartments } from "@/lib/db/departments"
import { sanitizePhotoPath } from "@/lib/db/sanitize-photo-path"

export interface UpsertUserInput {
  entraOid: string
  email: string | null
  fullName: string
  photoPath: string | null
  staffId?: string | null
  department?: string | null
  jobTitle?: string | null
}

export interface UserDoc {
  _id: number
  entra_oid: string
  email: string | null
  id_card_number?: string | null
  staff_id: string | null
  full_name: string
  dob?: Date | string | null
  department: string | null
  job_title: string | null
  join_date?: Date | string | null
  photo_path: string | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

function clamp(value: string | null | undefined, max: number): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

export async function upsertUserFromSignIn(
  input: UpsertUserInput
): Promise<{ id: number }> {
  const entraOid = clamp(input.entraOid, 64)
  if (!entraOid) {
    throw new Error("entra_oid is required for user upsert")
  }

  const fullName = (input.fullName.trim() || "Unknown").slice(0, 255)
  const photoPath = sanitizePhotoPath(input.photoPath)
  const department = clamp(input.department, 128)
  const email = clamp(input.email, 255)
  const staffId = clamp(input.staffId, 64)
  const jobTitle = clamp(input.jobTitle, 128)

  try {
    await ensureDepartmentExists(department)
  } catch (error) {
    console.error("[nexmate] Failed to ensure department on sign-in:", error)
  }

  const users = await col<UserDoc>(COLLECTIONS.users)
  const existing = await users.findOne({ entra_oid: entraOid })
  const timestamp = now()

  if (existing) {
    await users.updateOne(
      { entra_oid: entraOid },
      {
        $set: {
          email,
          full_name: fullName,
          photo_path: photoPath,
          staff_id: staffId ?? existing.staff_id,
          department: department ?? existing.department,
          job_title: jobTitle ?? existing.job_title,
          deleted_at: null,
          updated_at: timestamp,
        },
      }
    )
    return { id: existing._id }
  }

  const id = await nextId(COLLECTIONS.users)
  await users.insertOne({
    _id: id,
    entra_oid: entraOid,
    email,
    id_card_number: null,
    staff_id: staffId,
    full_name: fullName,
    dob: null,
    department,
    job_title: jobTitle,
    join_date: null,
    photo_path: photoPath,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  })

  return { id }
}

export async function findUserIdByEntraOid(
  entraOid: string
): Promise<number | null> {
  const oid = clamp(entraOid, 64)
  if (!oid) return null
  const users = await col<UserDoc>(COLLECTIONS.users)
  const existing = await users.findOne({ entra_oid: oid, ...notDeleted<UserDoc>() })
  const id = Number(existing?._id)
  return Number.isFinite(id) && id > 0 ? id : null
}

export async function getUserDepartmentName(userId: number): Promise<string | null> {
  const users = await col<UserDoc>(COLLECTIONS.users)
  const user = await users.findOne({ _id: userId, ...notDeleted<UserDoc>() })
  if (typeof user?.department !== "string") return null
  const trimmed = user.department.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function searchUsersByNameEmailStaff(
  query: string,
  limit = 20
): Promise<UserDoc[]> {
  const users = await col<UserDoc>(COLLECTIONS.users)
  const trimmed = query.trim()
  const filter = trimmed
    ? {
        ...notDeleted<UserDoc>(),
        $or: [
          { full_name: contains(trimmed) },
          { email: contains(trimmed) },
          { staff_id: contains(trimmed) },
        ],
      }
    : notDeleted<UserDoc>()

  return users.find(filter).sort({ full_name: 1 }).limit(limit).toArray()
}

export interface DepartmentUserRecord {
  id: number
  fullName: string
  email: string | null
  department: string | null
}

export async function listUsersByDepartmentIds(
  departmentIds: number[]
): Promise<DepartmentUserRecord[]> {
  const uniqueIds = uniquePositiveIds(departmentIds)
  if (uniqueIds.length === 0) return []

  const departments = await listDepartments()
  const names = departments
    .filter((department) => uniqueIds.includes(department.id))
    .map((department) => department.name.trim())
    .filter((name) => name.length > 0)
  if (names.length === 0) return []

  const users = await col<UserDoc>(COLLECTIONS.users)
  const rows = await users
    .find({
      ...notDeleted<UserDoc>(),
      department: { $in: names },
    })
    .sort({ full_name: 1 })
    .limit(500)
    .toArray()

  return rows.map((row) => ({
    id: row._id,
    fullName: row.full_name,
    email: row.email,
    department: row.department,
  }))
}
