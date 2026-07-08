import { cookies } from "next/headers";
import { getDb } from "../db/client";
import { PERMISSION_MATRIX } from "../db/seed-static";

export interface SessionUser {
  id: string;
  role_code: string;
  name: string;
  title: string;
  mission: string;
}

const COOKIE_NAME = "aegis_user";

export function getCurrentUser(): SessionUser | null {
  const userId = cookies().get(COOKIE_NAME)?.value;
  if (!userId) return null;
  const db = getDb();
  const user = db.prepare(`SELECT id, role_code, name, title, mission FROM users WHERE id = ?`).get(userId) as SessionUser | undefined;
  return user ?? null;
}

export function requireUser(): SessionUser {
  const user = getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export function canWrite(roleCode: string, scope: string): boolean {
  const perms = PERMISSION_MATRIX[roleCode];
  if (!perms) return false;
  if (roleCode === "EXEC_SPONSOR") return scope === "approvals";
  return perms.write.includes(scope);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
