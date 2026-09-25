/** Matches `users.photo_path` column length (see migration 20260530_003). */
export const USERS_PHOTO_PATH_MAX_LENGTH = 2048

export function sanitizePhotoPath(
  value: string | null | undefined
): string | null {
  if (!value) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  // Entra/NextAuth may pass data URLs — too large for a path column.
  if (trimmed.startsWith("data:")) return null

  if (trimmed.length > USERS_PHOTO_PATH_MAX_LENGTH) {
    return null
  }

  return trimmed
}
