import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Mail } from "lucide-react";
import type { LoginLogEntry } from "@/lib/actions/login-log";

interface Props {
  entries: LoginLogEntry[];
}

function relative(iso: string): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function absolute(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function LoginLogPanel({ entries }: Props) {
  const last24h = entries.filter((e) => {
    if (!e.at) return false;
    return Date.now() - new Date(e.at).getTime() < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Login log
          </h2>
          <p className="text-xs text-muted-foreground">
            Most recent sign-in per user. {entries.length} tracked users ·{" "}
            <span className="font-medium text-foreground">
              {last24h} active in last 24h
            </span>
            .
          </p>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Activity className="h-3 w-3" />
          Owner view
        </Badge>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No login data yet.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2 text-right">Last login</th>
                <th className="px-4 py-2 text-right whitespace-nowrap">
                  When
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
                      {relative(e.at)}
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
