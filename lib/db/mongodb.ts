import {
  MongoClient,
  type ClientSession,
  type Collection,
  type Db,
  type Document,
  type Filter,
} from "mongodb"

type MongoCache = {
  client?: MongoClient
  connectPromise?: Promise<MongoClient>
  db?: Db
  indexesPromise?: Promise<void>
}

const globalForMongo = globalThis as typeof globalThis & {
  __nexmateMongo?: MongoCache
}

function mongoCache(): MongoCache {
  if (!globalForMongo.__nexmateMongo) {
    globalForMongo.__nexmateMongo = {}
  }
  return globalForMongo.__nexmateMongo
}

function isMongoTopologyClosed(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const name = "name" in error ? String(error.name) : ""
  const message = "message" in error ? String(error.message) : ""
  return name === "MongoTopologyClosedError" || /topology is closed/i.test(message)
}

function clearMongoCache(existing?: MongoClient): void {
  const cache = mongoCache()
  if (existing && cache.client && cache.client !== existing) return
  globalForMongo.__nexmateMongo = {}
  if (!existing) return
  void existing.close().catch(() => undefined)
}

const DEFAULT_DATABASE = "nexmate"

export const COLLECTIONS = {
  counters: "counters",
  users: "users",
  roles: "roles",
  permissions: "permissions",
  rolePermissions: "role_permissions",
  userRoles: "user_roles",
  departments: "departments",
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]

export interface NumericIdDoc {
  _id: number
}

export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) {
    throw new Error("MONGODB_URI is required")
  }
  return uri
}

export function getMongoDatabaseName(): string {
  const name = process.env.MONGODB_DATABASE?.trim()
  return name && name.length > 0 ? name : DEFAULT_DATABASE
}

export function getMongoConfigSummary(): {
  database: string
  hosts: string
} {
  let hosts = ""
  try {
    const uri = getMongoUri()
    const parsed = new URL(uri.replace(/^mongodb\+srv/i, "https"))
    hosts = parsed.host
  } catch {
    hosts = "(unparseable MONGODB_URI)"
  }

  return {
    database: getMongoDatabaseName(),
    hosts,
  }
}

export function formatMongoConnectionHint(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error)

  if (/MONGODB_URI is required/i.test(message)) {
    return "Set MONGODB_URI in .env.local to your MongoDB Atlas connection string."
  }

  if (/authentication failed|bad auth|unauthorized/i.test(message)) {
    return "MongoDB rejected the credentials in MONGODB_URI. Check the username, password, and database user privileges."
  }

  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|querySrv|server selection timed out/i.test(message)) {
    return "Cannot reach MongoDB Atlas. Check network access (IP allowlist) and that MONGODB_URI is correct."
  }

  if (/topology is closed/i.test(message)) {
    return "The MongoDB connection was reset. Try signing in again; if it keeps happening, restart the Next.js dev server."
  }

  if (/tlsv1 alert internal error|SSL alert number 80|ReplicaSetNoPrimary|SystemOverloaded/i.test(message)) {
    return "MongoDB Atlas rejected the TLS handshake. This is often a blocked client IP or a brief cluster overload. Add this computer's current public IP in Atlas → Network Access, wait 1–2 minutes, then sign in again."
  }

  return null
}

function mongoErrorLabels(error: unknown): Set<string> {
  if (error && typeof error === "object" && "errorLabelSet" in error) {
    const labels = (error as { errorLabelSet?: unknown }).errorLabelSet
    if (labels instanceof Set) return labels as Set<string>
  }
  return new Set()
}

function isRetryableConnectError(error: unknown): boolean {
  if (isMongoTopologyClosed(error)) return true
  const labels = mongoErrorLabels(error)
  if (
    labels.has("RetryableError") ||
    labels.has("SystemOverloadedError") ||
    labels.has("ResetPool")
  ) {
    return true
  }
  const message = error instanceof Error ? error.message : String(error)
  return /tlsv1 alert internal error|SSL alert number 80|ReplicaSetNoPrimary/i.test(
    message
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runPool(
  jobs: Array<() => Promise<unknown>>,
  concurrency: number
): Promise<void> {
  let next = 0
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next]
      next += 1
      await job()
    }
  }
  const workers = Math.min(Math.max(concurrency, 1), jobs.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
}

async function connectMongoClient(): Promise<MongoClient> {
  const options = {
    appName: process.env.MONGODB_APP_NAME ?? "nexmate",
    maxPoolSize: 5,
    minPoolSize: 0,
    maxIdleTimeMS: 30_000,
    serverSelectionTimeoutMS: 20_000,
    retryReads: true,
    retryWrites: true,
    autoSelectFamily: false,
    family: 4,
  }

  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt++) {
    const mongoClient = new MongoClient(getMongoUri(), options)
    try {
      await mongoClient.connect()
      mongoCache().client = mongoClient
      return mongoClient
    } catch (error) {
      lastError = error
      await mongoClient.close().catch(() => undefined)
      if (attempt < 3 && isRetryableConnectError(error)) {
        await delay(attempt * 800)
        continue
      }
      throw error
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function getMongoClient(): Promise<MongoClient> {
  const cache = mongoCache()
  if (!cache.connectPromise) {
    cache.connectPromise = connectMongoClient().catch((error) => {
      clearMongoCache()
      throw error
    })
  }
  return cache.connectPromise
}

export async function getDb(): Promise<Db> {
  const mongoClient = await getMongoClient()
  const cache = mongoCache()
  const database = cache.db ?? mongoClient.db(getMongoDatabaseName())
  cache.db = database

  if (!cache.indexesPromise) {
    cache.indexesPromise = ensureMongoIndexes(database).catch((error) => {
      console.error("[nexmate] Failed to ensure MongoDB indexes:", error)
      const current = mongoCache()
      if (current.db === database) current.indexesPromise = undefined
    })
  }

  return database
}

export async function col<T extends Document = Document>(
  name: CollectionName
): Promise<Collection<T>> {
  const database = await getDb()
  return database.collection<T>(name)
}

export async function pingMongo(): Promise<boolean> {
  const database = await getDb()
  const result = await database.command({ ping: 1 })
  return result.ok === 1
}

export async function nextId(
  collectionName: CollectionName,
  session?: ClientSession
): Promise<number> {
  const database = await getDb()
  const result = await database.collection<{ _id: string; seq: number }>(COLLECTIONS.counters).findOneAndUpdate(
    { _id: collectionName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", session }
  )

  const seq = result?.seq
  if (typeof seq !== "number" || !Number.isFinite(seq) || seq < 1) {
    throw new Error(`Failed to allocate id for ${collectionName}`)
  }
  return seq
}

export async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>
): Promise<T> {
  const mongoClient = await getMongoClient()
  const session = mongoClient.startSession()
  try {
    return await session.withTransaction(() => fn(session))
  } finally {
    await session.endSession()
  }
}

export function now(): Date {
  return new Date()
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function contains(value: string): { $regex: string; $options: string } {
  return { $regex: escapeRegex(value), $options: "i" }
}

export function notDeleted<T extends { deleted_at?: Date | null }>(): Filter<T> {
  return { deleted_at: null } as Filter<T>
}

export function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      Number((error as { code: unknown }).code) === 11000
  )
}

export function duplicateErrorMessage(error: unknown, fallback = "Duplicate record"): Error {
  if (isDuplicateKeyError(error)) {
    return new Error(fallback)
  }
  return error instanceof Error ? error : new Error(String(error))
}

export function toId(value: unknown): number {
  return Number(value)
}

export function uniquePositiveIds(ids: Array<number | string | null | undefined>): number[] {
  return [
    ...new Set(
      ids
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ]
}

export async function mapById<T extends { _id: number }>(
  collection: Collection<T>,
  ids: Array<number | null | undefined>,
  session?: ClientSession
): Promise<Map<number, T>> {
  const unique = uniquePositiveIds(ids.filter((id): id is number => typeof id === "number"))
  if (unique.length === 0) return new Map()
  const docs = await collection.find({ _id: { $in: unique } } as Filter<T>, { session }).toArray()
  return new Map(docs.map((doc) => [Number(doc._id), doc as T]))
}

export function startOfUtcDay(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00.000Z`)
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
}

async function ensureMongoIndexes(database: Db): Promise<void> {
  await runPool([
    () => database.collection(COLLECTIONS.users).createIndexes([
      { key: { entra_oid: 1 }, unique: true, name: "uk_users_entra_oid" },
      {
        key: { staff_id: 1 },
        unique: true,
        name: "uk_users_staff_id",
        partialFilterExpression: { staff_id: { $type: "string" } },
      },
      {
        key: { id_card_number: 1 },
        unique: true,
        name: "uk_users_id_card_number",
        partialFilterExpression: { id_card_number: { $type: "string" } },
      },
      { key: { deleted_at: 1 }, name: "idx_users_deleted_at" },
      { key: { department: 1 }, name: "idx_users_department" },
      { key: { email: 1 }, name: "idx_users_email" },
      { key: { full_name: 1 }, name: "idx_users_full_name" },
    ]),
    () => database.collection(COLLECTIONS.roles).createIndexes([
      { key: { slug: 1 }, unique: true, name: "uk_roles_slug" },
      { key: { name: 1 }, unique: true, name: "uk_roles_name" },
      { key: { deleted_at: 1 }, name: "idx_roles_deleted_at" },
    ]),
    () => database.collection(COLLECTIONS.permissions).createIndexes([
      { key: { perm_key: 1 }, unique: true, name: "uk_permissions_perm_key" },
      { key: { module: 1 }, name: "idx_permissions_module" },
    ]),
    () => database.collection(COLLECTIONS.rolePermissions).createIndexes([
      {
        key: { role_id: 1, permission_id: 1 },
        unique: true,
        name: "uk_role_permissions",
      },
      { key: { permission_id: 1 }, name: "idx_role_permissions_permission" },
    ]),
    () => database.collection(COLLECTIONS.userRoles).createIndexes([
      { key: { user_id: 1, role_id: 1 }, unique: true, name: "uk_user_roles" },
      { key: { role_id: 1 }, name: "idx_user_roles_role" },
    ]),
    () => database.collection(COLLECTIONS.departments).createIndexes([
      { key: { name: 1 }, unique: true, name: "uk_departments_name" },
    ]),
  ], 2)
}
