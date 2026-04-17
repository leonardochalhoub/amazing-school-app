import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  hasServiceRole,
  createServiceClient,
  ensureProfile,
  cleanupProfiles,
} from "../fixtures/supabase-test-client";

const TEACHER_ID = "00000000-0000-4000-8000-000000000a01";
const STUDENT_A = "00000000-0000-4000-8000-000000000a02";
const STUDENT_B = "00000000-0000-4000-8000-000000000a03";

describe.skipIf(!hasServiceRole())("assignments integration", () => {
  const supabase = hasServiceRole() ? createServiceClient() : null;
  let classroomId = "";

  beforeAll(async () => {
    if (!supabase) return;
    await ensureProfile(supabase, TEACHER_ID, "Test Teacher", "teacher");
    await ensureProfile(supabase, STUDENT_A, "Student A", "student");
    await ensureProfile(supabase, STUDENT_B, "Student B", "student");

    const { data: classroom } = await supabase
      .from("classrooms")
      .insert({ teacher_id: TEACHER_ID, name: "Assignments Test Class" })
      .select()
      .single();
    classroomId = classroom!.id;

    await supabase.from("classroom_members").insert([
      { classroom_id: classroomId, student_id: STUDENT_A },
      { classroom_id: classroomId, student_id: STUDENT_B },
    ]);
  });

  afterAll(async () => {
    if (!supabase) return;
    await supabase.from("classrooms").delete().eq("id", classroomId);
    await cleanupProfiles(supabase, [TEACHER_ID, STUDENT_A, STUDENT_B]);
  });

  it("assigns a lesson to a single student (student_id non-null)", async () => {
    if (!supabase) return;
    const { error } = await supabase.from("lesson_assignments").insert({
      classroom_id: classroomId,
      lesson_slug: "present-simple",
      student_id: STUDENT_A,
      assigned_by: TEACHER_ID,
      order_index: 0,
    });
    expect(error).toBeNull();

    const { data } = await supabase
      .from("lesson_assignments")
      .select("*")
      .eq("classroom_id", classroomId)
      .eq("student_id", STUDENT_A);
    expect(data?.length).toBe(1);
  });

  it("assigns classroom-wide (student_id null) without conflicting", async () => {
    if (!supabase) return;
    const { error } = await supabase.from("lesson_assignments").insert({
      classroom_id: classroomId,
      lesson_slug: "present-simple",
      student_id: null,
      assigned_by: TEACHER_ID,
      order_index: 0,
    });
    expect(error).toBeNull();
  });

  it("rejects duplicate per-student assignment via unique partial index", async () => {
    if (!supabase) return;
    const { error } = await supabase.from("lesson_assignments").insert({
      classroom_id: classroomId,
      lesson_slug: "present-simple",
      student_id: STUDENT_A,
      assigned_by: TEACHER_ID,
      order_index: 0,
    });
    expect(error?.code).toBe("23505");
  });

  it("rejects duplicate classroom-wide assignment", async () => {
    if (!supabase) return;
    const { error } = await supabase.from("lesson_assignments").insert({
      classroom_id: classroomId,
      lesson_slug: "present-simple",
      student_id: null,
      assigned_by: TEACHER_ID,
      order_index: 0,
    });
    expect(error?.code).toBe("23505");
  });

  it("merges per-student + classroom-wide rows for the student queue", async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("lesson_assignments")
      .select("*")
      .eq("classroom_id", classroomId)
      .or(`student_id.is.null,student_id.eq.${STUDENT_A}`);
    const perStudent = data?.filter((a) => a.student_id === STUDENT_A) ?? [];
    const classroomWide = data?.filter((a) => a.student_id === null) ?? [];
    expect(perStudent.length).toBeGreaterThanOrEqual(1);
    expect(classroomWide.length).toBeGreaterThanOrEqual(1);
  });
});
