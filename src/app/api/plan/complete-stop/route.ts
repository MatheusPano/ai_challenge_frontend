import { NextResponse } from "next/server";
import { backend } from "@/lib/backend";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const data = await backend<unknown>("/api/plan/complete-stop", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 502 });
  }
}
