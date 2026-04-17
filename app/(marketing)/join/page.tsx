import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { previewInvitation } from "@/lib/actions/student-invitations";
import { JoinClient } from "./join-client";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <Shell title="Invalid link">
        <p className="text-sm text-muted-foreground">
          This invitation link is missing its token. Ask your teacher to send
          you a fresh link.
        </p>
      </Shell>
    );
  }

  const preview = await previewInvitation(token);
  if ("error" in preview) {
    return (
      <Shell title="Link can't be used">
        <p className="text-sm text-muted-foreground">{preview.error}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Ask your teacher for a fresh invitation.
        </p>
      </Shell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If the signed-in user is the teacher who issued the link, send them back.
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role === "teacher") {
      redirect("/teacher");
    }
  }

  return (
    <Shell title="You've been invited!">
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">{preview.teacher.full_name}</strong>{" "}
        invited you to join{" "}
        <strong className="text-foreground">{preview.classroom.name}</strong>.
      </p>
      <JoinClient
        token={preview.token}
        prefillEmail={preview.email}
        prefillName={preview.display_name}
        currentlySignedIn={!!user}
      />
    </Shell>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[480px] w-[880px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/8 via-violet-500/5 to-pink-500/8 blur-3xl" />
      </div>
      <header className="border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-9 w-9" />
            <span
              className="bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text font-[family-name:var(--font-display)] text-xl italic leading-none text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400"
              style={{ letterSpacing: "-0.015em" }}
            >
              Amazing School
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">{children}</CardContent>
        </Card>
      </main>
    </div>
  );
}
