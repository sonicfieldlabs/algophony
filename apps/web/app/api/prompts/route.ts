import { getPrompts } from "../../lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const prompts = getPrompts();
  return Response.json(prompts);
}
