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
  const [gender, setGender] = useState<"female" | "male" | "">("");
  const [xpEnabled, setXpEnabled] = useState<boolean>(true);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    // Public signup is teacher-only. Students join through an invitation link.
    formData.set("role", "teacher");
    formData.set("location", location.trim());
    formData.set("gender", gender);
    formData.set("xpEnabled", xpEnabled ? "on" : "off");
    if (!location.trim()) {
      setError(
        locale === "pt-BR"
          ? "Escolha sua cidade (obrigatório)."
          : "Pick your city (required).",
      );
      setLoading(false);
      return;
    }
    if (gender !== "female" && gender !== "male") {
      setError(
        locale === "pt-BR"
          ? "Selecione o gênero: masculino ou feminino."
          : "Select a gender: male or female.",
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
            <div className="space-y-2">
              <Label>
                {locale === "pt-BR" ? "Gênero (obrigatório)" : "Gender (required)"}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    gender === "male"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {locale === "pt-BR" ? "Masculino" : "Male"}
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    gender === "female"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {locale === "pt-BR" ? "Feminino" : "Female"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {locale === "pt-BR"
                  ? "Usamos apenas para o tratamento em português (Professor / Professora)."
                  : "Used only for gendered Portuguese wording (Professor / Professora)."}
              </p>
            </div>

            {/* XP / gamification opt-in — teacher-only. Defaults to
                ON; the teacher can flip it off in /teacher/profile
                anytime (and later flip it back on with everything
                they previously earned preserved). */}
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Label className="text-sm font-semibold">
                    {locale === "pt-BR"
                      ? "Começar com XP e auto-aprendizado ligados?"
                      : "Start with XP and self-learning on?"}
                  </Label>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {locale === "pt-BR"
                      ? "Ligado = aulas, lições e conquistas somam XP e abrem medalhas para você. Você pode desligar ou religar no perfil a qualquer momento — nada se perde."
                      : "On = classes, lessons, and achievements earn you XP and unlock badges. You can flip this in your profile anytime — nothing is lost when it's off."}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={xpEnabled}
                  onClick={() => setXpEnabled((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    xpEnabled
                      ? "bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 shadow-[0_0_18px_-4px_rgba(139,92,246,0.7)]"
                      : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                      xpEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
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
