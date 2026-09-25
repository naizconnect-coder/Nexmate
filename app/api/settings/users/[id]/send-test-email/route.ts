import { NextRequest, NextResponse } from "next/server"
import { jsonError, requirePermission } from "@/lib/api/route-auth"
import { PERM } from "@/lib/auth/permissions"
import { getUserById } from "@/lib/db/settings/users-repository"
import { sendSmtpMail } from "@/lib/notifications/smtp-mail"

export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ id: string }>
}

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const { error } = await requirePermission(PERM.settings.users.write)
  if (error) return error

  const { id: idParam } = await context.params
  const id = parseId(idParam)
  if (!id) return jsonError("Invalid user id")

  try {
    const user = await getUserById(id)
    if (!user) return jsonError("User not found", 404)

    const email = user.email?.trim()
    if (!email) {
      return jsonError("User does not have an email address", 400)
    }

    const sentAt = new Date().toISOString()
    const htmlBody = `
      <p>This is a test email from Nexmate.</p>
      <p>Hello ${escapeHtml(user.fullName)},</p>
      <p>If you received this message, email delivery to your inbox is working correctly.</p>
      <p style="color:#666;font-size:12px;">Sent at ${escapeHtml(sentAt)}</p>
    `.trim()

    await sendSmtpMail({
      to: [{ email, name: user.fullName }],
      subject: "Nexmate test email",
      htmlBody,
    })

    return NextResponse.json({ ok: true, email, method: "smtp" })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to send test email"
    return jsonError(message, 500)
  }
}
