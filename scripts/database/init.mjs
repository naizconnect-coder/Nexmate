#!/usr/bin/env node
/**
 * Import scripts/nexmate_*.sql into MongoDB.
 *
 * Never drops users, roles, permissions, role_permissions, or user_roles.
 * Other collections are replaced from the dump.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { MongoClient } from "mongodb"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "../..")

const PROTECTED_COLLECTIONS = new Set([
  "users",
  "roles",
  "permissions",
  "role_permissions",
  "user_roles",
])

const JUNCTION_TABLES = new Set(["role_permissions", "user_roles"])

const DATE_TIME_COLUMNS = new Set([
  "created_at",
  "updated_at",
  "deleted_at",
])

const DATE_ONLY_COLUMNS = new Set(["dob", "join_date"])

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = join(ROOT, file)
    if (!existsSync(path)) continue
    for (const rawLine of readFileSync(path, "utf8").split("\n")) {
      const line = rawLine.trim()
      if (!line || line.startsWith("#")) continue
      const eq = line.indexOf("=")
      if (eq <= 0) continue
      const key = line.slice(0, eq).trim()
      if (process.env[key]) continue
      let value = line.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  }
}

function findDumpFile() {
  const scriptsDir = join(ROOT, "scripts")
  const files = readdirSync(scriptsDir)
    .filter((name) => /^nexmate_.*\.sql$/i.test(name))
    .sort()
  const latest = files.at(-1)
  if (!latest) {
    throw new Error("No scripts/nexmate_*.sql dump found")
  }
  return join(scriptsDir, latest)
}

function parseSqlString(sql, start) {
  let i = start + 1
  let out = ""
  while (i < sql.length) {
    const ch = sql[i]
    if (ch === "\\") {
      const next = sql[i + 1]
      if (next === undefined) break
      out += next
      i += 2
      continue
    }
    if (ch === "'") {
      if (sql[i + 1] === "'") {
        out += "'"
        i += 2
        continue
      }
      return { value: out, next: i + 1 }
    }
    out += ch
    i += 1
  }
  throw new Error("Unterminated SQL string")
}

function parseSqlValue(sql, start) {
  let i = start
  while (i < sql.length && /\s/.test(sql[i])) i += 1

  if (sql.startsWith("NULL", i) && !/[A-Za-z0-9_]/.test(sql[i + 4] ?? "")) {
    return { value: null, next: i + 4 }
  }

  if (sql[i] === "'") {
    return parseSqlString(sql, i)
  }

  const rest = sql.slice(i)
  const match = rest.match(/^-?\d+(?:\.\d+)?/)
  if (match) {
    const raw = match[0]
    const value = raw.includes(".") ? Number(raw) : Number.parseInt(raw, 10)
    return { value, next: i + raw.length }
  }

  throw new Error(`Unexpected SQL value at ${i}: ${sql.slice(i, i + 40)}`)
}

function parseRow(sql, start) {
  let i = start
  while (i < sql.length && sql[i] !== "(") i += 1
  if (sql[i] !== "(") throw new Error("Expected '(' to start VALUES row")
  i += 1
  const values = []
  while (i < sql.length) {
    while (i < sql.length && /\s/.test(sql[i])) i += 1
    if (sql[i] === ")") {
      return { values, next: i + 1 }
    }
    const parsed = parseSqlValue(sql, i)
    values.push(parsed.value)
    i = parsed.next
    while (i < sql.length && /\s/.test(sql[i])) i += 1
    if (sql[i] === ",") {
      i += 1
      continue
    }
    if (sql[i] === ")") {
      return { values, next: i + 1 }
    }
    throw new Error(`Expected ',' or ')' in VALUES row near: ${sql.slice(i, i + 40)}`)
  }
  throw new Error("Unterminated VALUES row")
}

function parseInserts(sql) {
  const tables = new Map()
  const insertRe = /INSERT INTO `([^`]+)` \(([^)]+)\)\s*VALUES/gi
  let match
  while ((match = insertRe.exec(sql))) {
    const table = match[1]
    const columns = match[2]
      .split(",")
      .map((part) => part.trim().replace(/`/g, ""))
    let i = insertRe.lastIndex
    const rows = []
    while (i < sql.length) {
      while (i < sql.length && /[\s,]/.test(sql[i])) i += 1
      if (sql[i] === ";") {
        i += 1
        break
      }
      if (sql[i] !== "(") break
      const parsed = parseRow(sql, i)
      rows.push(parsed.values)
      i = parsed.next
    }
    insertRe.lastIndex = i
    const existing = tables.get(table) ?? { columns, rows: [] }
    existing.rows.push(...rows)
    tables.set(table, existing)
  }
  return tables
}

function toDate(value) {
  if (typeof value !== "string") return value
  const normalized = value.includes("T") ? value : value.replace(" ", "T")
  const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(normalized)
    ? normalized
    : `${normalized}Z`
  const date = new Date(withZone)
  return Number.isNaN(date.getTime()) ? value : date
}

function convertValue(column, value) {
  if (value == null) return null
  if (DATE_TIME_COLUMNS.has(column)) return toDate(value)
  if (DATE_ONLY_COLUMNS.has(column) && typeof value === "string") {
    return value.slice(0, 10)
  }
  return value
}

function toDocuments(table, columns, rows) {
  return rows.map((values) => {
    const doc = {}
    for (let i = 0; i < columns.length; i += 1) {
      const column = columns[i]
      const value = convertValue(column, values[i])
      if (column === "id" && !JUNCTION_TABLES.has(table)) {
        doc._id = Number(value)
      } else {
        doc[column] = value
      }
    }
    return doc
  })
}

async function setCounters(db, imported) {
  const counters = db.collection("counters")
  for (const [table, docs] of imported.entries()) {
    if (JUNCTION_TABLES.has(table)) continue
    const maxId = docs.reduce((max, doc) => {
      const id = Number(doc._id)
      return Number.isFinite(id) && id > max ? id : max
    }, 0)
    if (maxId < 1) continue
    await counters.updateOne(
      { _id: table },
      { $max: { seq: maxId } },
      { upsert: true }
    )
  }
}

async function main() {
  loadEnv()
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error("MONGODB_URI is required")
  }
  const databaseName = process.env.MONGODB_DATABASE?.trim() || "nexmate"
  const dumpPath = findDumpFile()
  console.log(`Reading dump ${dumpPath}`)
  const sql = readFileSync(dumpPath, "utf8")
  const inserts = parseInserts(sql)

  const client = new MongoClient(uri, { appName: "nexmate-db-init" })
  await client.connect()
  const db = client.db(databaseName)
  const imported = new Map()

  try {
    for (const [table, { columns, rows }] of inserts.entries()) {
      const docs = toDocuments(table, columns, rows)
      imported.set(table, docs)
      const collection = db.collection(table)

      if (PROTECTED_COLLECTIONS.has(table)) {
        console.log(`==> ${table}: upsert ${docs.length} (protected, never dropped)`)
        for (const doc of docs) {
          if (JUNCTION_TABLES.has(table)) {
            const filter =
              table === "role_permissions"
                ? { role_id: doc.role_id, permission_id: doc.permission_id }
                : { user_id: doc.user_id, role_id: doc.role_id }
            await collection.updateOne(filter, { $set: doc }, { upsert: true })
          } else {
            await collection.replaceOne({ _id: doc._id }, doc, { upsert: true })
          }
        }
        continue
      }

      console.log(`==> ${table}: replace ${docs.length}`)
      await collection.deleteMany({})
      if (docs.length > 0) {
        await collection.insertMany(docs)
      }
    }

    await setCounters(db, imported)
    console.log(`Done -> ${databaseName} (${[...imported.keys()].length} collections)`)
    console.log(`Protected collections: ${[...PROTECTED_COLLECTIONS].join(", ")}`)
  } finally {
    await client.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
