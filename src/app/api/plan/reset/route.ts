import { NextResponse } from "next/server";
import { backend } from "@/lib/backend";

export async function POST() {
  try {
    const data = await backend<unknown>("/api/plan/all", { method: "DELETE" });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 502 });
  }
}
