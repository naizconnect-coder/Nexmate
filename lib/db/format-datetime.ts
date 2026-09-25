export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString()
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? new Date(0).toISOString()
    : parsed.toISOString()
}
