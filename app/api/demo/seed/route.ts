import { NextResponse } from "next/server";
import { generateDemoData } from "@/lib/demo-data/generator";

export async function POST() {
  const result = generateDemoData(Date.now());
  return NextResponse.json({ ok: true, ...result });
}
