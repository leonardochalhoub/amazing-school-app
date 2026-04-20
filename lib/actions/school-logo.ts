"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTeacherRole } from "@/lib/auth/roles";

/**
 * Teachers can always toggle the brand logo on/off. The whitelist only
 * affects WHICH image is shown (pre-set file for Leo + Tatiana, their
 * own upload for everyone else).
 */
export async function setSchoolLogoEnabled(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole((profile as { role?: string } | null)?.role)) {
    return { error: "Teacher only" };
  }

  const { error } = await admin
    .from("profiles")
    .update({ school_logo_enabled: enabled })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/teacher");
  revalidatePath("/teacher/profile");
  return { success: true as const };
}

// ---------------------------------------------------------------------------
// Upload / remove the teacher's own school logo
// ---------------------------------------------------------------------------

const MAX_BYTES = 8 * 1024 * 1024;
// SVG is intentionally not on the list: librsvg inside sharp has a
// history of CPU-bomb CVEs when fed a malicious vector. Teachers can
// still upload their logos as PNG, JPG, or WebP — which is every
// photo-format in the wild. Vector-only assets can be exported to
// PNG locally before upload.
const ALLOWED = ["image/png", "image/jpeg", "image/webp"] as const;
const SHARP_TIMEOUT_MS = 10_000;

export async function uploadSchoolLogo(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole((profile as { role?: string } | null)?.role)) {
    return { error: "Teacher only" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file uploaded" };
  if (file.size === 0) return { error: "Empty file" };
  if (file.size > MAX_BYTES) return { error: "File too large (max 8 MB)" };
  if (!ALLOWED.includes(file.type as (typeof ALLOWED)[number])) {
    return { error: "Unsupported image type (PNG, JPEG, or WebP)" };
  }

  // Normalise to a wide landscape webp capped at 1600 x 400 so navbar
  // rendering stays fast regardless of what the teacher uploads. The
  // whole sharp pipeline is wrapped in a 10s timeout so a malicious
  // (or just gigantic) image can't pin a Next.js worker.
  const buf = Buffer.from(await file.arrayBuffer());
  let webp: Buffer;
  try {
    webp = await Promise.race<Buffer>([
      sharp(buf)
        .rotate()
        .resize(1600, 400, { fit: "inside", withoutEnlargement: true })
        .trim({ threshold: 8 })
        .webp({ quality: 88 })
        .toBuffer(),
      new Promise<Buffer>((_, reject) =>
        setTimeout(
          () => reject(new Error("sharp timeout")),
          SHARP_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch {
    return { error: "Image processing failed" };
  }

  const path = `${user.id}.webp`;
  const { error: upErr } = await admin.storage
    .from("school-logos")
    .upload(path, webp, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "60",
    });
  if (upErr) return { error: upErr.message };

  const { error: dbErr } = await admin
    .from("profiles")
    .update({ school_logo_url: path, school_logo_enabled: true })
    .eq("id", user.id);
  if (dbErr) return { error: dbErr.message };

  revalidatePath("/teacher");
  revalidatePath("/teacher/profile");
  return { success: true as const };
}

export async function removeSchoolLogo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const admin = createAdminClient();
  await admin.storage.from("school-logos").remove([`${user.id}.webp`]);

  const { error } = await admin
    .from("profiles")
    .update({ school_logo_url: null })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/teacher");
  revalidatePath("/teacher/profile");
  return { success: true as const };
}