"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED)[number];

export async function uploadAvatar(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file" };
  if (file.size === 0) return { error: "Empty file" };
  if (file.size > MAX_BYTES) return { error: "File too large (max 5 MB)" };
  if (!ALLOWED.includes(file.type as AllowedMime)) {
    return { error: "Unsupported image type (use JPEG, PNG, or WebP)" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  console.log("[uploadAvatar] start", {
    userId: user.id,
    fileSize: file.size,
    type: file.type,
  });

  const buf = Buffer.from(await file.arrayBuffer());
  let webp: Buffer;
  try {
    webp = await sharp(buf)
      .rotate()
      .resize(512, 512, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (err) {
    console.error("[uploadAvatar] sharp error:", err);
    return {
      error: `Image processing failed: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  const path = `${user.id}.webp`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, webp, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "3600",
    });
  if (upErr) {
    console.error("[uploadAvatar] storage upload error:", upErr);
    return { error: `Storage: ${upErr.message}` };
  }

  const { error: profileErr, data: updated } = await supabase
    .from("profiles")
    .update({ avatar_url: path })
    .eq("id", user.id)
    .select("id, avatar_url");
  if (profileErr) {
    console.error("[uploadAvatar] profiles update error:", profileErr);
    return { error: `Profile update: ${profileErr.message}` };
  }
  console.log("[uploadAvatar] updated row(s):", updated);
  if (!updated || updated.length === 0) {
    return {
      error:
        "Profile row was not updated (likely RLS). Ask an admin to check profiles UPDATE policy.",
    };
  }

  revalidatePath("/student/profile");
  revalidatePath("/student");
  revalidatePath("/teacher");
  return { success: true as const };
}

export async function removeAvatar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  await supabase.storage.from("avatars").remove([`${user.id}.webp`]);
  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  revalidatePath("/student/profile");
  return { success: true as const };
}
