"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTeacherRole } from "@/lib/auth/roles";
import { SIGNATURE_BUCKET, signaturePath } from "@/lib/signature";

const MAX_BYTES = 4 * 1024 * 1024;
// SVG deliberately excluded — same CPU-bomb concern as school logos.
const ALLOWED = ["image/png", "image/jpeg", "image/webp"] as const;
const SHARP_TIMEOUT_MS = 10_000;

/**
 * Upload (or replace) the signed-in teacher's signature. We aggressively
 * trim surrounding whitespace + normalize to a wide-aspect webp so the
 * signature lines up cleanly on the signature-line in every report.
 */
export async function uploadSignature(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole((profile as { role?: string } | null)?.role)) {
    return { error: "Acesso apenas para professores" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Nenhum arquivo enviado" };
  if (file.size === 0) return { error: "Arquivo vazio" };
  if (file.size > MAX_BYTES)
    return { error: "Arquivo muito grande (máximo 4 MB)" };
  if (!ALLOWED.includes(file.type as (typeof ALLOWED)[number])) {
    return { error: "Formato não suportado (PNG, JPEG ou WebP)" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let webp: Buffer;
  try {
    webp = await Promise.race<Buffer>([
      sharp(buf)
        .rotate()
        // Trim aggressively — teachers photograph signatures on paper
        // and we want only the ink, no margin.
        .trim({ threshold: 12 })
        .resize(900, 260, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 92 })
        .toBuffer(),
      new Promise<Buffer>((_, reject) =>
        setTimeout(
          () => reject(new Error("sharp timeout")),
          SHARP_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch {
    return { error: "Falha ao processar a imagem" };
  }

  const path = signaturePath(user.id);
  const { error: upErr } = await admin.storage
    .from(SIGNATURE_BUCKET)
    .upload(path, webp, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "60",
    });
  if (upErr) return { error: upErr.message };

  const { error: dbErr } = await admin
    .from("profiles")
    .update({ signature_url: path })
    .eq("id", user.id);
  if (dbErr) return { error: dbErr.message };

  revalidatePath("/teacher/profile");
  return { success: true as const };
}

export async function removeSignature() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  await admin.storage
    .from(SIGNATURE_BUCKET)
    .remove([signaturePath(user.id)]);

  const { error } = await admin
    .from("profiles")
    .update({ signature_url: null, signature_enabled: false })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/teacher/profile");
  return { success: true as const };
}

/**
 * Toggle whether the signature image is embedded on reports. Off →
 * only the printed name appears. Teachers can flip this without
 * re-uploading.
 */
export async function setSignatureEnabled(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, signature_url")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole((profile as { role?: string } | null)?.role)) {
    return { error: "Acesso apenas para professores" };
  }
  if (
    enabled &&
    !(profile as { signature_url?: string | null } | null)?.signature_url
  ) {
    return { error: "Envie a imagem da assinatura antes de ativar" };
  }

  const { error } = await admin
    .from("profiles")
    .update({ signature_enabled: enabled })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/teacher/profile");
  return { success: true as const };
}
