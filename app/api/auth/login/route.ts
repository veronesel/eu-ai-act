import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  const db = getDb();
  const user = db.prepare(`SELECT id FROM users WHERE id = ?`).get(userId);
  if (!user) return NextResponse.json({ error: "Unknown demo user" }, { status: 400 });
  cookies().set(SESSION_COOKIE_NAME, userId, { httpOnly: true, sameSite: "lax", path: "/" });
  return NextResponse.json({ ok: true });
}
