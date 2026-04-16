"use client";

import { useState } from "react";
import { signUp } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/context";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function SignUpPage() {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"teacher" | "student">("student");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("role", role);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <>
      <div className="absolute top-4 right-4 flex gap-2">
        <LocaleToggle />
        <ThemeToggle />
      </div>
      <Card>
        <CardHeader className="text-center">
          <div className="text-3xl mb-2">🎓</div>
          <CardTitle className="text-2xl font-bold">{t.auth.signup}</CardTitle>
          <CardDescription>{t.auth.signupDesc}</CardDescription>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">{t.auth.fullName}</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t.auth.iAmA}</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={role === "teacher" ? "default" : "outline"}
                  onClick={() => setRole("teacher")}
                  className="w-full"
                >
                  {t.auth.teacher}
                </Button>
                <Button
                  type="button"
                  variant={role === "student" ? "default" : "outline"}
                  onClick={() => setRole("student")}
                  className="w-full"
                >
                  {t.auth.student}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.auth.creatingAccount : t.auth.signup}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t.auth.hasAccount}{" "}
              <Link href="/login" className="text-primary hover:underline">
                {t.auth.login}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
