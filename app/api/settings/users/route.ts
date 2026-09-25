import { NextRequest, NextResponse } from "next/server"
import { jsonError, requirePermission } from "@/lib/api/route-auth"
import { PERM } from "@/lib/auth/permissions"
import { parsePagination } from "@/lib/api/pagination"
import { ensureSettingsSchema } from "@/lib/db/settings/ensure-settings-schema"
import {
  createUser,
  listUsersPaginated,
} from "@/lib/db/settings/users-repository"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(PERM.settings.users.read)
  if (error) return error

  try {
    await ensureSettingsSchema()
    const params = parsePagination(request.nextUrl.searchParams)
    const result = await listUsersPaginated(params)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list users"
    return jsonError(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission(PERM.settings.users.write)
  if (error) return error

  try {
    const body = (await request.json()) as {
      entraOid?: string
      email?: string | null
      fullName?: string
      staffId?: string | null
      department?: string | null
      jobTitle?: string | null
      roleIds?: number[]
    }

    if (!body.entraOid?.trim() || !body.fullName?.trim()) {
      return jsonError("entraOid and fullName are required")
    }

    const user = await createUser({
      entraOid: body.entraOid,
      email: body.email,
      fullName: body.fullName,
      staffId: body.staffId,
      department: body.department,
      jobTitle: body.jobTitle,
      roleIds: body.roleIds,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create user"
    const status = message.includes("Duplicate") ? 409 : 500
    return jsonError(message, status)
  }
}
