import { NextResponse } from "next/server";
import { getGenerations } from "../../lib/data";

export async function GET() {
  return NextResponse.json(getGenerations());
}
