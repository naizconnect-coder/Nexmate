import { NextRequest, NextResponse } from "next/server"
import { jsonError, requirePermission } from "@/lib/api/route-auth"
import { PERM } from "@/lib/auth/permissions"
import {
  deleteUser,
  getUserById,
  updateUser,
} from "@/lib/db/settings/users-repository"

export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ id: string }>
}

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(PERM.settings.users.read)
  if (error) return error

  const { id: idParam } = await context.params
  const id = parseId(idParam)
  if (!id) return jsonError("Invalid user id")

  try {
    const user = await getUserById(id)
    if (!user) return jsonError("User not found", 404)
    return NextResponse.json(user)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch user"
    return jsonError(message, 500)
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(PERM.settings.users.write)
  if (error) return error

  const { id: idParam } = await context.params
  const id = parseId(idParam)
  if (!id) return jsonError("Invalid user id")

  try {
    const body = (await request.json()) as {
      email?: string | null
      fullName?: string
      staffId?: string | null
      department?: string | null
      jobTitle?: string | null
      roleIds?: number[]
    }

    const user = await updateUser(id, body)
    if (!user) return jsonError("User not found", 404)
    return NextResponse.json(user)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update user"
    return jsonError(message, 500)
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(PERM.settings.users.write)
  if (error) return error

  const { id: idParam } = await context.params
  const id = parseId(idParam)
  if (!id) return jsonError("Invalid user id")

  try {
    const ok = await deleteUser(id)
    if (!ok) return jsonError("User not found", 404)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete user"
    return jsonError(message, 500)
  }
}
