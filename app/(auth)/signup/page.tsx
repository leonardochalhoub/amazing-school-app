"use client";

import { useState } from "react";
import { signUp } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/context";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrazilCityPicker } from "@/components/shared/brazil-city-picker";
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
  const { t, locale } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    // Public signup is teacher-only. Students join through an invitation link.
    formData.set("role", "teacher");
    formData.set("location", location.trim());
    if (!location.trim()) {
      setError(
        locale === "pt-BR"
          ? "Escolha sua cidade (obrigatório)."
          : "Pick your city (required).",
      );
      setLoading(false);
      return;
    }
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
        <CardHeader className="flex flex-col items-center text-center">
          <BrandMark className="mb-2 h-12 w-12" />
          <CardTitle className="text-2xl font-bold">
            {locale === "pt-BR"
              ? "Cadastro de professor"
              : "Teacher sign up"}
          </CardTitle>
          <CardDescription>
            {locale === "pt-BR"
              ? "O cadastro é apenas para professores. Alunos entram pelo link de convite enviado pelo professor."
              : "Sign-up is for teachers only. Students join through the invitation link their teacher sends them."}
          </CardDescription>
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
              <Label htmlFor="location">
                {locale === "pt-BR"
                  ? "Cidade (obrigatório)"
                  : "City (required)"}
              </Label>
              <BrazilCityPicker
                value={location}
                onChange={setLocation}
                placeholder={
                  locale === "pt-BR"
                    ? "São Paulo, SP"
                    : "Pick your city"
                }
              />
              <p className="text-[11px] text-muted-foreground">
                {locale === "pt-BR"
                  ? "Comece a digitar — a lista filtra as cidades brasileiras. Para outras cidades, digite livremente."
                  : "Start typing — the list filters Brazilian cities. Type freely for anywhere else."}
              </p>
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
