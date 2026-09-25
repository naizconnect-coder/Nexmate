import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireAnyPermission, requirePermission } from "@/lib/api/route-auth"
import { PERM } from "@/lib/auth/permissions"
import { parsePagination } from "@/lib/api/pagination"
import {
  createDepartment,
  listDepartments,
  listDepartmentsPaginated,
} from "@/lib/db/departments"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { error } = await requireAnyPermission([
    PERM.settings.departments.read,
    PERM.settings.users.read,
  ])
  if (error) return error

  try {
    if (request.nextUrl.searchParams.has("page")) {
      const params = parsePagination(request.nextUrl.searchParams)
      const result = await listDepartmentsPaginated(params)
      return NextResponse.json(result)
    }

    const departments = await listDepartments()
    return NextResponse.json({ departments })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load departments"
    return jsonError(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requirePermission(PERM.settings.departments.write)
  if (error) return error

  try {
    const body = (await request.json()) as { name?: string }
    if (!body.name?.trim()) {
      return jsonError("Department name is required")
    }

    const department = await createDepartment(body.name)
    return NextResponse.json(department, { status: 201 })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create department"
    if (message.includes("required")) return jsonError(message, 400)
    if (message.includes("already exists")) return jsonError(message, 409)
    return jsonError(message, 500)
  }
}
