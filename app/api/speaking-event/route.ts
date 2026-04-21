import { NextResponse } from "next/server";
import { logSpeakingEvent } from "@/lib/actions/speaking-events";

/**
 * Thin HTTP wrapper around the logSpeakingEvent server action so
 * client recorders can fire-and-forget a POST without pulling the
 * action into the client bundle. Any error is swallowed on the
 * client side — the teacher stats table simply shows fewer rows.
 */
export async function POST(req: Request) {
  let body: {
    durationMs?: number;
    context?: string | null;
    startedAtIso?: string | null;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const res = await logSpeakingEvent({
    durationMs: Number(body.durationMs) || 0,
    context: body.context ?? null,
    startedAtIso: body.startedAtIso ?? null,
  });
  if ("error" in res) {
    return NextResponse.json(res, { status: 400 });
  }
  return NextResponse.json(res);
}
