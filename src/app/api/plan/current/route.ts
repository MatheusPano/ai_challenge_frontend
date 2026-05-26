import { NextResponse } from "next/server";
import { backend } from "@/lib/backend";

export async function GET() {
  try {
    const data = await backend<unknown>("/api/plan/current", { method: "GET" });
    return NextResponse.json(data);
  } catch (e) {
    const msg = String(e);
    const status = msg.includes("404") ? 404 : 502;
    return NextResponse.json({ message: msg }, { status });
  }
}
