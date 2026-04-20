"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTeacherRole } from "@/lib/auth/roles";
import {
  formatCpf,
  normalizeCpfForStorage,
} from "@/lib/reports/cpf";

export interface ServiceReceiptRecord {
  id: string;
  teacherId: string;
  rosterStudentId: string | null;
  clientName: string;
  clientCpf: string | null;
  description: string;
  amountCents: number;
  currency: string;
  issuedOn: string;
  notes: string | null;
  receiptNumber: string;
  createdAt: string;
}

const InputSchema = z.object({
  rosterStudentId: z.string().uuid().nullable().optional(),
  clientName: z.string().trim().min(1).max(140),
  clientCpf: z.string().max(20).optional().or(z.literal("")),
  description: z.string().trim().min(1).max(500),
  amountCents: z.number().int().min(1).max(100_000_000),
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(600).optional().or(z.literal("")),
});

export async function createServiceReceipt(input: z.input<typeof InputSchema>) {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

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

  // If a roster student is referenced, make sure it belongs to
  // this teacher — otherwise leave rosterStudentId null.
  let rosterStudentId: string | null = parsed.data.rosterStudentId ?? null;
  if (rosterStudentId) {
    const { data: roster } = await admin
      .from("roster_students")
      .select("teacher_id")
      .eq("id", rosterStudentId)
      .maybeSingle();
    if (!roster || (roster as { teacher_id: string }).teacher_id !== user.id) {
      rosterStudentId = null;
    }
  }

  const { data, error } = await admin
    .from("service_receipts")
    .insert({
      teacher_id: user.id,
      roster_student_id: rosterStudentId,
      client_name: parsed.data.clientName.trim(),
      client_cpf: normalizeCpfForStorage(parsed.data.clientCpf),
      description: parsed.data.description.trim(),
      amount_cents: parsed.data.amountCents,
      issued_on: parsed.data.issuedOn,
      notes: (parsed.data.notes ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/teacher/admin");
  return { success: true as const, id: data.id as string };
}

export async function deleteServiceReceipt(receiptId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("service_receipts")
    .select("teacher_id")
    .eq("id", receiptId)
    .maybeSingle();
  if (!row) return { error: "Recibo não encontrado" };
  if ((row as { teacher_id: string }).teacher_id !== user.id) {
    return { error: "Sem permissão" };
  }

  const { error } = await admin
    .from("service_receipts")
    .delete()
    .eq("id", receiptId);
  if (error) return { error: error.message };
  revalidatePath("/teacher/admin");
  return { success: true as const };
}

export async function listServiceReceiptsForTeacher(): Promise<
  ServiceReceiptRecord[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole((profile as { role?: string } | null)?.role)) return [];

  const { data } = await admin
    .from("service_receipts")
    .select("*")
    .eq("teacher_id", user.id)
    .order("issued_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(2_000);

  return ((data ?? []) as Array<{
    id: string;
    teacher_id: string;
    roster_student_id: string | null;
    client_name: string;
    client_cpf: string | null;
    description: string;
    amount_cents: number;
    currency: string;
    issued_on: string;
    notes: string | null;
    receipt_number: string;
    created_at: string;
  }>).map((r) => ({
    id: r.id,
    teacherId: r.teacher_id,
    rosterStudentId: r.roster_student_id,
    clientName: r.client_name,
    clientCpf: r.client_cpf ? formatCpf(r.client_cpf) : null,
    description: r.description,
    amountCents: r.amount_cents,
    currency: r.currency,
    issuedOn: r.issued_on,
    notes: r.notes,
    receiptNumber: r.receipt_number,
    createdAt: r.created_at,
  }));
}

export interface ServiceReceiptPrintData extends ServiceReceiptRecord {
  teacher: {
    fullName: string | null;
    email: string | null;
    signatureUrl: string | null;
    signatureEnabled: boolean;
    schoolLogoEnabled: boolean;
    schoolLogoUrl: string | null;
  };
}

export async function getServiceReceiptForPrint(
  receiptId: string,
): Promise<ServiceReceiptPrintData | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  const admin = createAdminClient();

  const { data } = await admin
    .from("service_receipts")
    .select("*")
    .eq("id", receiptId)
    .maybeSingle();
  if (!data) return { error: "Recibo não encontrado" };
  const row = data as {
    id: string;
    teacher_id: string;
    roster_student_id: string | null;
    client_name: string;
    client_cpf: string | null;
    description: string;
    amount_cents: number;
    currency: string;
    issued_on: string;
    notes: string | null;
    receipt_number: string;
    created_at: string;
  };
  if (row.teacher_id !== user.id) return { error: "Sem permissão" };

  // Teacher branding — pulled here instead of via a shared loader
  // so this action stays self-contained.
  const [{ data: profileRaw }, authRes] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "full_name, school_logo_enabled, school_logo_url, signature_url, signature_enabled",
      )
      .eq("id", row.teacher_id)
      .maybeSingle(),
    admin.auth.admin.getUserById(row.teacher_id),
  ]);
  const profile = (profileRaw as {
    full_name: string | null;
    school_logo_enabled: boolean | null;
    school_logo_url: string | null;
    signature_url: string | null;
    signature_enabled: boolean | null;
  } | null) ?? {
    full_name: null,
    school_logo_enabled: false,
    school_logo_url: null,
    signature_url: null,
    signature_enabled: false,
  };
  const authUser = authRes.data?.user;
  const fullName =
    profile.full_name ??
    ((authUser?.user_metadata as { full_name?: string } | undefined)
      ?.full_name ??
      (authUser?.email ? authUser.email.split("@")[0] ?? null : null));

  const { getSignatureSignedUrl } = await import("@/lib/signature");
  const signatureEnabled = profile.signature_enabled === true;
  const signatureUrl =
    signatureEnabled && profile.signature_url
      ? await getSignatureSignedUrl(admin, row.teacher_id)
      : null;

  return {
    id: row.id,
    teacherId: row.teacher_id,
    rosterStudentId: row.roster_student_id,
    clientName: row.client_name,
    clientCpf: row.client_cpf ? formatCpf(row.client_cpf) : null,
    description: row.description,
    amountCents: row.amount_cents,
    currency: row.currency,
    issuedOn: row.issued_on,
    notes: row.notes,
    receiptNumber: row.receipt_number,
    createdAt: row.created_at,
    teacher: {
      fullName,
      email: authUser?.email ?? null,
      signatureUrl,
      signatureEnabled,
      schoolLogoEnabled: profile.school_logo_enabled ?? false,
      schoolLogoUrl: profile.school_logo_url,
    },
  };
}
