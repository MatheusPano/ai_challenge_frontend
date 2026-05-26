import { NextResponse } from "next/server";
import { backend } from "@/lib/backend";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: "invalid or empty JSON body" },
      { status: 400 },
    );
  }
  try {
    const data = await backend<unknown>("/api/plan/text", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 502 });
  }
}
