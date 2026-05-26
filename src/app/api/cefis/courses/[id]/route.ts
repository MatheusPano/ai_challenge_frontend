import { NextResponse } from "next/server";
import { backend } from "@/lib/backend";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await backend<unknown>(`/api/cefis/courses/${id}`, {
      method: "GET",
    });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ message: String(e) }, { status: 502 });
  }
}
