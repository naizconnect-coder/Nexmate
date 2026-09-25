export function safeCallbackUrl(raw: string | null | undefined): string {
  if (raw == null || typeof raw !== "string") return "/"
  const t = raw.trim()
  if (!t.startsWith("/") || t.startsWith("//")) return "/"
  return t
}
