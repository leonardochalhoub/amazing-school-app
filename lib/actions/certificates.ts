"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTeacherRole } from "@/lib/auth/roles";
import { getSignatureSignedUrl } from "@/lib/signature";
import {
  CERTIFICATE_LEVELS,
  GRADE_OPTIONS,
  type CertificateLevelCode,
  type Grade,
} from "@/lib/reports/certificate-levels";

export interface CertificateRecord {
  id: string;
  rosterStudentId: string;
  teacherId: string;
  level: CertificateLevelCode;
  grade: Grade;
  courseStartOn: string;
  courseEndOn: string;
  title: string | null;
  remarks: string | null;
  issuedAt: string;
  /** Human-readable certificate number — derived, not stored. */
  certificateNumber: string;
  student: {
    fullName: string;
    classroomName: string | null;
    email: string | null;
  };
  teacher: {
    id: string;
    fullName: string | null;
    email: string | null;
    schoolLogoEnabled: boolean;
    schoolLogoUrl: string | null;
    signatureUrl: string | null;
    signatureEnabled: boolean;
  };
}

export interface CertificateSummary {
  id: string;
  level: string;
  grade: Grade;
  courseStartOn: string;
  courseEndOn: string;
  title: string | null;
  issuedAt: string;
}

const InputSchema = z.object({
  rosterStudentId: z.string().uuid(),
  level: z.enum(CERTIFICATE_LEVELS.map((l) => l.code) as [string, ...string[]]),
  grade: z.enum(GRADE_OPTIONS.map((g) => g.value) as [string, ...string[]]),
  courseStartOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  courseEndOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().max(160).optional().or(z.literal("")),
  remarks: z.string().max(600).optional().or(z.literal("")),
});

export async function createCertificate(input: z.input<typeof InputSchema>) {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  if (parsed.data.courseEndOn < parsed.data.courseStartOn) {
    return { error: "A data de término deve ser posterior ao início" };
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

  const { data: roster } = await admin
    .from("roster_students")
    .select("teacher_id")
    .eq("id", parsed.data.rosterStudentId)
    .maybeSingle();
  if (!roster) return { error: "Aluno não encontrado" };
  if ((roster as { teacher_id: string }).teacher_id !== user.id) {
    return { error: "Sem permissão" };
  }

  const { data, error } = await admin
    .from("certificates")
    .insert({
      roster_student_id: parsed.data.rosterStudentId,
      teacher_id: user.id,
      level: parsed.data.level,
      grade: parsed.data.grade,
      course_start_on: parsed.data.courseStartOn,
      course_end_on: parsed.data.courseEndOn,
      title: parsed.data.title || null,
      remarks: parsed.data.remarks || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(`/teacher/students/${parsed.data.rosterStudentId}`);
  revalidatePath("/student/profile");
  return { success: true as const, id: data.id as string };
}

export async function deleteCertificate(certificateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("certificates")
    .select("teacher_id, roster_student_id")
    .eq("id", certificateId)
    .maybeSingle();
  if (!existing) return { error: "Certificado não encontrado" };
  if ((existing as { teacher_id: string }).teacher_id !== user.id) {
    return { error: "Sem permissão" };
  }

  const { error } = await admin
    .from("certificates")
    .delete()
    .eq("id", certificateId);
  if (error) return { error: error.message };
  revalidatePath(
    `/teacher/students/${(existing as { roster_student_id: string }).roster_student_id}`,
  );
  revalidatePath("/student/profile");
  return { success: true as const };
}

export async function listCertificatesForStudent(
  rosterStudentId: string,
): Promise<CertificateSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();

  // Dual-role: teacher who owns the roster OR the student themselves.
  const { data: rosterRow } = await admin
    .from("roster_students")
    .select("teacher_id, auth_user_id")
    .eq("id", rosterStudentId)
    .maybeSingle();
  if (!rosterRow) return [];
  const r = rosterRow as { teacher_id: string; auth_user_id: string | null };
  if (r.teacher_id !== user.id && r.auth_user_id !== user.id) return [];

  const { data } = await admin
    .from("certificates")
    .select(
      "id, level, grade, course_start_on, course_end_on, title, issued_at",
    )
    .eq("roster_student_id", rosterStudentId)
    .order("issued_at", { ascending: false });
  return ((data ?? []) as Array<{
    id: string;
    level: string;
    grade: string;
    course_start_on: string;
    course_end_on: string;
    title: string | null;
    issued_at: string;
  }>).map((d) => ({
    id: d.id,
    level: d.level,
    grade: d.grade as Grade,
    courseStartOn: d.course_start_on,
    courseEndOn: d.course_end_on,
    title: d.title,
    issuedAt: d.issued_at,
  }));
}

export async function listMyCertificates(): Promise<CertificateSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();

  const { data: rosterRow } = await admin
    .from("roster_students")
    .select("id")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!rosterRow) return [];
  const rosterId = (rosterRow as { id: string }).id;

  const { data } = await admin
    .from("certificates")
    .select(
      "id, level, grade, course_start_on, course_end_on, title, issued_at",
    )
    .eq("roster_student_id", rosterId)
    .order("issued_at", { ascending: false });
  return ((data ?? []) as Array<{
    id: string;
    level: string;
    grade: string;
    course_start_on: string;
    course_end_on: string;
    title: string | null;
    issued_at: string;
  }>).map((d) => ({
    id: d.id,
    level: d.level,
    grade: d.grade as Grade,
    courseStartOn: d.course_start_on,
    courseEndOn: d.course_end_on,
    title: d.title,
    issuedAt: d.issued_at,
  }));
}

export async function getCertificate(
  certificateId: string,
): Promise<CertificateRecord | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };
  const admin = createAdminClient();

  const { data: rowRaw } = await admin
    .from("certificates")
    .select(
      "id, roster_student_id, teacher_id, level, grade, course_start_on, course_end_on, title, remarks, issued_at",
    )
    .eq("id", certificateId)
    .maybeSingle();
  if (!rowRaw) return { error: "Certificado não encontrado" };
  const row = rowRaw as {
    id: string;
    roster_student_id: string;
    teacher_id: string;
    level: string;
    grade: string;
    course_start_on: string;
    course_end_on: string;
    title: string | null;
    remarks: string | null;
    issued_at: string;
  };

  const [{ data: rosterRaw }, { data: teacherRaw }] = await Promise.all([
    admin
      .from("roster_students")
      .select("full_name, email, classroom_id, auth_user_id, classrooms(name)")
      .eq("id", row.roster_student_id)
      .maybeSingle(),
    admin
      .from("profiles")
      .select(
        "full_name, email, school_logo_enabled, school_logo_url, signature_url, signature_enabled",
      )
      .eq("id", row.teacher_id)
      .maybeSingle(),
  ]);

  if (!rosterRaw) return { error: "Aluno não encontrado" };
  const roster = rosterRaw as {
    full_name: string;
    email: string | null;
    classroom_id: string | null;
    auth_user_id: string | null;
    classrooms: { name: string } | { name: string }[] | null;
  };

  // Dual-role: teacher who issued OR student linked to the roster.
  if (row.teacher_id !== user.id && roster.auth_user_id !== user.id) {
    return { error: "Sem permissão" };
  }

  const teacher = (teacherRaw as {
    full_name: string | null;
    email: string | null;
    school_logo_enabled: boolean | null;
    school_logo_url: string | null;
    signature_url: string | null;
    signature_enabled: boolean | null;
  } | null) ?? {
    full_name: null,
    email: null,
    school_logo_enabled: false,
    school_logo_url: null,
    signature_url: null,
    signature_enabled: false,
  };

  const signatureEnabled = teacher.signature_enabled === true;
  const signatureUrl =
    signatureEnabled && teacher.signature_url
      ? await getSignatureSignedUrl(admin, row.teacher_id)
      : null;

  const classroom = Array.isArray(roster.classrooms)
    ? roster.classrooms[0]
    : roster.classrooms;

  // Certificate number — stable + sortable. 8 hex chars give us
  // ~4.29B possible suffixes, practically collision-free even at
  // platform-wide scale.
  const month = row.issued_at.slice(0, 7).replace("-", "");
  const suffix = row.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const certificateNumber = `AS-CERT-${month}-${suffix}`;

  return {
    id: row.id,
    rosterStudentId: row.roster_student_id,
    teacherId: row.teacher_id,
    level: row.level as CertificateLevelCode,
    grade: row.grade as Grade,
    courseStartOn: row.course_start_on,
    courseEndOn: row.course_end_on,
    title: row.title,
    remarks: row.remarks,
    issuedAt: row.issued_at,
    certificateNumber,
    student: {
      fullName: roster.full_name,
      classroomName: classroom?.name ?? null,
      email: roster.email,
    },
    teacher: {
      id: row.teacher_id,
      fullName: teacher.full_name,
      email: teacher.email,
      schoolLogoEnabled: teacher.school_logo_enabled ?? false,
      schoolLogoUrl: teacher.school_logo_url,
      signatureUrl,
      signatureEnabled,
    },
  };
}
