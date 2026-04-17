"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  BankItemSchema,
  type BankItemInput,
  type BankItemRow,
} from "@/lib/actions/teacher-lessons-types";

export async function saveToBank(input: BankItemInput) {
  const parsed = BankItemSchema.safeParse(input);
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const record = {
    author_id: user.id,
    title: parsed.data.title,
    cefr_level: parsed.data.cefr_level ?? null,
    tags: parsed.data.tags ?? [],
    exercise: parsed.data.exercise,
    is_public: parsed.data.is_public ?? false,
  };

  const q = parsed.data.id
    ? supabase.from("exercise_bank_items").update(record).eq("id", parsed.data.id).eq("author_id", user.id)
    : supabase.from("exercise_bank_items").insert(record);

  const { data, error } = await q.select("*").single();
  if (error) return { error: error.message };

  revalidatePath("/teacher/bank");
  return { success: true as const, item: data as BankItemRow };
}

export async function setBankItemPublic(id: string, isPublic: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { error } = await supabase
    .from("exercise_bank_items")
    .update({ is_public: isPublic })
    .eq("id", id)
    .eq("author_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/teacher/bank");
  return { success: true as const };
}

export async function deleteBankItem(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { error } = await supabase
    .from("exercise_bank_items")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/teacher/bank");
  return { success: true as const };
}

export async function listMyBank(): Promise<BankItemRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("exercise_bank_items")
    .select("*")
    .eq("author_id", user.id)
    .order("updated_at", { ascending: false });
  return (data as BankItemRow[] | null) ?? [];
}

export async function listPublicBank(params?: {
  cefr_level?: string;
  limit?: number;
}): Promise<BankItemRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("exercise_bank_items")
    .select("*")
    .eq("is_public", true);
  if (params?.cefr_level) q = q.eq("cefr_level", params.cefr_level);
  const { data } = await q
    .order("uses_count", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(params?.limit ?? 50);
  return (data as BankItemRow[] | null) ?? [];
}

export async function incrementBankUsage(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercise_bank_items")
    .select("uses_count")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { error: "Not found" };
  const { error } = await supabase
    .from("exercise_bank_items")
    .update({ uses_count: (data.uses_count ?? 0) + 1 })
    .eq("id", id);
  if (error) return { error: error.message };
  return { success: true as const };
}
