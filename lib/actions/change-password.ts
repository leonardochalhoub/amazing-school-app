"use server";

import { z } from "zod";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const Schema = z.object({
  current: z.string().min(1),
  next: z.string().min(8, "New password must be at least 8 characters"),
});

/**
 * Change-password flow.
 *
 *   1. Session user resolved via the cookie-bridged server client.
 *   2. Current password verified with an EPHEMERAL supabase-js
 *      client (no cookie bridge) so the verification sign-in doesn't
 *      swap the user's live session cookies mid-request. Fails with
 *      a generic message on bad password — doesn't leak whether the
 *      email exists.
 *   3. New password applied via the service-role admin client, so
 *      the change takes effect server-side and doesn't depend on
 *      the caller having a fresh enough session for updateUser().
 *
 * Demo accounts (email starts with "demo.") are intentionally
 * blocked — the account is shared across every public visitor, so
 * letting one person rotate the password would lock everyone else
 * out of the demo.
 */
export async function changePassword(
  input: z.input<typeof Schema>,
): Promise<{ success: true } | { error: string }> {
  const parsed = Schema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not signed in" };

  const email = user.email.toLowerCase();
  if (email.startsWith("demo.")) {
    return {
      error:
        "Demo accounts can't change their password — the account is shared.",
    };
  }

  const verify = createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: verifyErr } = await verify.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (verifyErr) return { error: "Current password is incorrect" };

  const admin = createAdminClient();
  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.next,
  });
  if (updateErr) return { error: updateErr.message };

  return { success: true };
}
