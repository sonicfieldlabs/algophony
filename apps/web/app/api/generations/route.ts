import { NextResponse } from "next/server";
import { getGenerations } from "../../lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getGenerations());
}
