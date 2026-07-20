import { NextResponse } from "next/server";
import { getTrends } from "@/server/trends";

export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get("refresh") === "1";
  const topics = await getTrends(force);
  return NextResponse.json({ topics, count: topics.length });
}
