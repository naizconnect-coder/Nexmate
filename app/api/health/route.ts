import { NextResponse } from "next/server"
import {
  formatMongoConnectionHint,
  getMongoConfigSummary,
  pingMongo,
  COLLECTIONS,
  col,
} from "@/lib/db/mongodb"

export const dynamic = "force-dynamic"

export async function GET() {
  const mongo = getMongoConfigSummary()
  try {
    const db = await pingMongo()
    const users = await col(COLLECTIONS.users)
    const userCount = await users.countDocuments()
    return NextResponse.json({
      status: "ok",
      db,
      mongodb: mongo,
      users: { count: userCount },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const hint = formatMongoConnectionHint(error)
    return NextResponse.json(
      {
        status: "error",
        db: false,
        error: message,
        hint,
        mongodb: mongo,
      },
      { status: 503 }
    )
  }
}
