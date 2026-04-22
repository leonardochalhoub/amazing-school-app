import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiProviderInfo } from "@/lib/ai/provider-info";
import { isTeacherRole } from "@/lib/auth/roles";

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(
  base: string,
  takenByTeacher: Set<string>,
  takenInBank: Set<string>,
): Promise<string> {
  let root = base || "lesson";
  if (root.length < 3) root = `${root}-lesson`;
  let slug = root;
  let i = 2;
  while (takenByTeacher.has(slug) || takenInBank.has(slug)) {
    slug = `${root}-${i}`;
    i += 1;
  }
  return slug;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole(profile?.role as string | null | undefined)) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    context?: string;
    locale?: string;
  };
  const context = (body.context ?? "").trim().slice(0, 2000);
  const locale = body.locale === "pt-BR" ? "pt-BR" : "en";

  // Pull the candidate slug-space so we never hand back a collision.
  const [{ data: myLessons }, { data: bankEntries }] = await Promise.all([
    admin
      .from("teacher_lessons")
      .select("slug")
      .eq("teacher_id", user.id),
    admin
      .from("lesson_bank_entries")
      .select("slug")
      .eq("author_id", user.id),
  ]);
  const takenByTeacher = new Set<string>(
    (myLessons ?? []).map((r: { slug: string }) => r.slug),
  );
  const takenInBank = new Set<string>(
    (bankEntries ?? []).map((r: { slug: string }) => r.slug),
  );

  const info = getAiProviderInfo();
  const fallbackTitle = context
    ? context.split(/\s+/).slice(0, 6).join(" ")
    : locale === "pt-BR"
      ? "Nova lição"
      : "New lesson";

  if (info.provider === "none" || !context) {
    const slug = await uniqueSlug(
      slugify(fallbackTitle),
      takenByTeacher,
      takenInBank,
    );
    return Response.json({
      title: fallbackTitle,
      slug,
      rationale:
        locale === "pt-BR"
          ? "Sem IA configurada — slug único gerado a partir do título."
          : "No AI configured — unique slug generated from the title.",
    });
  }

  const model =
    info.provider === "groq"
      ? groq(info.model)
      : info.provider === "google"
        ? google(info.model)
        : anthropic(info.model);

  const system = `You help a Brazilian English teacher pick a short, memorable lesson title
and a URL slug. Return STRICT JSON only, no prose, matching this shape:

  {"title": "...", "slug": "...", "rationale": "..."}

Rules:
- Title is in ${locale === "pt-BR" ? "Portuguese or English, whichever the teacher used" : "English"}.
- Title ≤ 60 characters, no quotes, no trailing punctuation.
- Slug is lowercase ASCII, words separated by "-", 3–50 chars, no accents, no spaces.
- Rationale is a single sentence (≤120 chars) in ${locale === "pt-BR" ? "Portuguese" : "English"}.`;

  let parsed: { title?: string; slug?: string; rationale?: string } = {};
  try {
    const { text } = await generateText({
      model,
      system,
      prompt: `Teacher's context:\n---\n${context}\n---\n\nReturn the JSON now.`,
      maxOutputTokens: 220,
    });
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    }
  } catch {
    // Fall through to heuristic fallback.
  }

  const title =
    (parsed.title ?? "").trim().slice(0, 200) ||
    fallbackTitle.slice(0, 200);
  const slugBase = slugify(parsed.slug ?? title);
  const slug = await uniqueSlug(slugBase, takenByTeacher, takenInBank);

  return Response.json({
    title,
    slug,
    rationale:
      (parsed.rationale ?? "").trim() ||
      (locale === "pt-BR"
        ? "Sugestão com base no contexto fornecido."
        : "Suggestion based on the provided context."),
  });
}
