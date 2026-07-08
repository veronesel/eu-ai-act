import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { SCHEMA_SQL } from "./schema";

const DB_PATH = path.join(process.cwd(), "data", "aegis.db");

declare global {
  // eslint-disable-next-line no-var
  var __aegisDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

export function getDb(): Database.Database {
  if (!global.__aegisDb) {
    global.__aegisDb = createConnection();
  }
  return global.__aegisDb;
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
