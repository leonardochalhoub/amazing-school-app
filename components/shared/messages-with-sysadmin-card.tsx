"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Inbox, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SysadminMessageWithMeta } from "@/lib/actions/sysadmin-messages";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  messages: SysadminMessageWithMeta[];
  messagesHref: string;
}

export function MessagesWithSysadminCard({ messages, messagesHref }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? messages : messages.slice(0, 5);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          {pt ? "Mensagens com o sysadmin" : "Messages with sysadmin"}
        </CardTitle>
        <Badge variant="outline" className="text-[10px]">
          {messages.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {messages.length === 0 ? (
          <p className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            {pt
              ? "Sem mensagens por enquanto. Sugestões de revisão e aprovações aparecerão aqui."
              : "No messages yet. Review suggestions and approvals will appear here."}
          </p>
        ) : (
          <ul className="space-y-2">
            {visible.map((m) => (
              <li
                key={m.id}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {m.sender_role === "owner"
                        ? pt
                          ? "Sysadmin"
                          : "Sysadmin"
                        : m.sender_role === "teacher"
                          ? pt
                            ? "Professor"
                            : "Teacher"
                          : pt
                            ? "Aluno"
                            : "Student"}{" "}
                      · {m.sender_name || m.sender_email || "—"}
                    </p>
                    {m.subject ? (
                      <p className="truncate text-sm font-medium">{m.subject}</p>
                    ) : null}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      m.status === "approved"
                        ? "default"
                        : m.status === "rejected"
                          ? "destructive"
                          : "outline"
                    }
                    className="text-[10px]"
                  >
                    {m.status}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs">
                  {m.body}
                </p>
                {m.bank_entry_title ? (
                  <p className="mt-1 text-[10px] italic text-muted-foreground">
                    {pt ? "Sobre a lição:" : "About lesson:"}{" "}
                    <span className="font-medium">{m.bank_entry_title}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Link
            href={messagesHref}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Inbox className="h-3 w-3" />
            {pt ? "Ver tudo" : "See all"}
          </Link>
          {messages.length > 5 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpanded((v) => !v)}
              className="h-7 gap-1 text-[11px]"
            >
              <ChevronDown
                className={`h-3 w-3 transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
              {expanded
                ? pt
                  ? "Recolher"
                  : "Collapse"
                : pt
                  ? `+${messages.length - 5} mais`
                  : `+${messages.length - 5} more`}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
