import { NextRequest, NextResponse } from "next/server"
import { jsonError, requirePermission } from "@/lib/api/route-auth"
import { PERM } from "@/lib/auth/permissions"
import { parsePagination } from "@/lib/api/pagination"
import { ensureSettingsSchema } from "@/lib/db/settings/ensure-settings-schema"
import { createRole, listRolesPaginated } from "@/lib/db/settings/roles-repository"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { error } = await requirePermission(PERM.settings.roles.read)
  if (error) return error

  try {
    await ensureSettingsSchema()
    const params = parsePagination(request.nextUrl.searchParams)
    const result = await listRolesPaginated(params)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list roles"
    return jsonError(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission(PERM.settings.roles.write)
  if (error) return error

  try {
    const body = (await request.json()) as {
      name?: string
      description?: string | null
      permissionIds?: number[]
    }

    if (!body.name?.trim()) {
      return jsonError("Role name is required")
    }

    const role = await createRole({
      name: body.name,
      description: body.description,
      permissionIds: body.permissionIds ?? [],
    })

    return NextResponse.json(role, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create role"
    const status =
      message.includes("Duplicate") || message.includes("uk_roles") ? 409 : 500
    return jsonError(message, status)
  }
}
