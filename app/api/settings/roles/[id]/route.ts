import { NextRequest, NextResponse } from "next/server"
import { jsonError, requirePermission } from "@/lib/api/route-auth"
import { PERM } from "@/lib/auth/permissions"
import {
  deleteRole,
  getRoleById,
  updateRole,
} from "@/lib/db/settings/roles-repository"

export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ id: string }>
}

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(PERM.settings.roles.read)
  if (error) return error

  const { id: idParam } = await context.params
  const id = parseId(idParam)
  if (!id) return jsonError("Invalid role id")

  try {
    const role = await getRoleById(id)
    if (!role) return jsonError("Role not found", 404)
    return NextResponse.json(role)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch role"
    return jsonError(message, 500)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(PERM.settings.roles.write)
  if (error) return error

  const { id: idParam } = await context.params
  const id = parseId(idParam)
  if (!id) return jsonError("Invalid role id")

  try {
    const body = (await request.json()) as {
      name?: string
      description?: string | null
      permissionIds?: number[]
    }

    const role = await updateRole(id, body)
    if (!role) return jsonError("Role not found", 404)
    return NextResponse.json(role)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update role"
    return jsonError(message, 500)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(PERM.settings.roles.write)
  if (error) return error

  const { id: idParam } = await context.params
  const id = parseId(idParam)
  if (!id) return jsonError("Invalid role id")

  try {
    const ok = await deleteRole(id)
    if (!ok) return jsonError("Role not found", 404)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete role"
    const status = message.includes("System roles") ? 403 : 500
    return jsonError(message, status)
  }
}
