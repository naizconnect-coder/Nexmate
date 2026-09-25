import { COLLECTIONS, getDb } from "@/lib/db/mongodb"

const REQUIRED_COLLECTIONS = [
  COLLECTIONS.users,
  COLLECTIONS.roles,
  COLLECTIONS.permissions,
  COLLECTIONS.rolePermissions,
  COLLECTIONS.userRoles,
] as const

export async function ensureSettingsSchema(): Promise<void> {
  const database = await getDb()
  const existing = await database.listCollections({}, { nameOnly: true }).toArray()
  const found = new Set(existing.map((collection) => collection.name))
  const missing = REQUIRED_COLLECTIONS.filter((name) => !found.has(name))

  if (missing.length > 0) {
    throw new Error(
      `Missing database collections: ${missing.join(", ")}. Run npm run db:init to import the MongoDB seed.`
    )
  }
}
