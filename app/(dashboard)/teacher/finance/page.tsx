import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherManagementMatrix } from "@/lib/actions/teacher-payments";
import { TeacherFinanceBody } from "@/components/teacher/finance-body";

export default async function TeacherFinancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "teacher") redirect("/");

  const data = await getTeacherManagementMatrix({ months: 24 });
  if ("error" in data) {
    return <p className="py-12 text-center text-destructive">{data.error}</p>;
  }

  return <TeacherFinanceBody months={data.months} rows={data.rows} />;
}
