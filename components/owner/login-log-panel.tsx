"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import type { LoginLogEntry } from "@/lib/actions/login-log";

interface Props {
  entries: LoginLogEntry[];
}

function relative(iso: string, pt: boolean): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return pt ? "agora" : "just now";
  if (diffMin < 60) return pt ? `${diffMin}min atrás` : `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return pt ? `${h}h atrás` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return pt ? `${d}d atrás` : `${d}d ago`;
  return new Date(iso).toLocaleDateString(pt ? "pt-BR" : "en-US");
}

function absolute(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function LoginLogPanel({ entries }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const last24h = entries.filter((e) => {
    if (!e.at) return false;
    return Date.now() - new Date(e.at).getTime() < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {pt ? "Atividade recente" : "Recent activity"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {pt ? (
              <>
                Última vez que cada usuário esteve na plataforma
                (considera login + ping de sessão).{" "}
                {entries.length} monitorados ·{" "}
                <span className="font-medium text-foreground">
                  {last24h} ativos nas últimas 24h
                </span>
                .
              </>
            ) : (
              <>
                Last time each user was on the platform (sign-in +
                session ping combined). {entries.length} tracked ·{" "}
                <span className="font-medium text-foreground">
                  {last24h} active in last 24h
                </span>
                .
              </>
            )}
          </p>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Activity className="h-3 w-3" />
          {pt ? "Visão do proprietário" : "Owner view"}
        </Badge>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {pt ? "Ainda sem dados de login." : "No login data yet."}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">{pt ? "Usuário" : "User"}</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">{pt ? "Função" : "Role"}</th>
                <th className="px-4 py-2 text-right whitespace-nowrap">
                  {pt ? "Última atividade · BRT" : "Last active · BRT"}
                </th>
                <th className="px-4 py-2 text-right whitespace-nowrap">
                  {pt ? "Quando" : "When"}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-4 py-2 font-medium">
                    {e.fullName ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {e.email ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {e.role ?? "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">
                    {absolute(e.at)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {relative(e.at, pt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
