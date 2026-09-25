import { NextRequest, NextResponse } from "next/server"
import { jsonError, requirePermission } from "@/lib/api/route-auth"
import { PERM } from "@/lib/auth/permissions"
import {
  deleteDepartment,
  getDepartmentById,
  updateDepartment,
} from "@/lib/db/departments"

export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ id: string }>
}

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(PERM.settings.departments.read)
  if (error) return error

  const { id: idParam } = await context.params
  const id = parseId(idParam)
  if (!id) return jsonError("Invalid department id")

  try {
    const department = await getDepartmentById(id)
    if (!department) return jsonError("Department not found", 404)
    return NextResponse.json(department)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch department"
    return jsonError(message, 500)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(PERM.settings.departments.write)
  if (error) return error

  const { id: idParam } = await context.params
  const id = parseId(idParam)
  if (!id) return jsonError("Invalid department id")

  try {
    const body = (await request.json()) as { name?: string }
    if (!body.name?.trim()) {
      return jsonError("Department name is required")
    }

    const department = await updateDepartment(id, body.name)
    if (!department) return jsonError("Department not found", 404)
    return NextResponse.json(department)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update department"
    const status = message.includes("already exists")
      ? 409
      : message.includes("required")
        ? 400
        : 500
    return jsonError(message, status)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(PERM.settings.departments.write)
  if (error) return error

  const { id: idParam } = await context.params
  const id = parseId(idParam)
  if (!id) return jsonError("Invalid department id")

  try {
    const ok = await deleteDepartment(id)
    if (!ok) return jsonError("Department not found", 404)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete department"
    const status = message.includes("Cannot delete") ? 409 : 500
    return jsonError(message, status)
  }
}
