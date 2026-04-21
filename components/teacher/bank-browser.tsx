"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Lock,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  deleteBankItem,
  incrementBankUsage,
  setBankItemPublic,
} from "@/lib/actions/exercise-bank";
import type { BankItemRow } from "@/lib/actions/teacher-lessons-types";
import { CEFR_BANDS, cefrBandOf } from "@/lib/content/schema";
import { useI18n } from "@/lib/i18n/context";

type Tab = "mine" | "public";

interface Props {
  mine: BankItemRow[];
  publicItems: BankItemRow[];
}

export function BankBrowser({ mine, publicItems }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const [tab, setTab] = useState<Tab>("mine");
  const [cefrFilter, setCefrFilter] = useState<string>("");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const list = tab === "mine" ? mine : publicItems;
  const filtered = cefrFilter
    ? list.filter((i) => cefrBandOf(i.cefr_level ?? "") === cefrFilter)
    : list;

  const bandsInList = new Set(
    list
      .map((i) => cefrBandOf(i.cefr_level ?? ""))
      .filter((x): x is (typeof CEFR_BANDS)[number] => !!x),
  );
  const cefrOptions = CEFR_BANDS.filter((b) => bandsInList.has(b));

  function togglePublic(item: BankItemRow) {
    startTransition(async () => {
      const r = await setBankItemPublic(item.id, !item.is_public);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(
        item.is_public
          ? pt
            ? "Tornado privado."
            : "Made private."
          : pt
            ? "Publicado no banco público."
            : "Published to the public bank."
      );
      router.refresh();
    });
  }
  function remove(item: BankItemRow) {
    if (
      !confirm(
        pt
          ? `Excluir "${item.title}"? Esta ação não pode ser desfeita.`
          : `Delete "${item.title}"? This cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      const r = await deleteBankItem(item.id);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(pt ? "Excluído." : "Deleted.");
      router.refresh();
    });
  }
  async function copyImportLink(item: BankItemRow) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/teacher/lessons/new?import=${item.id}`
      );
      toast.success(
        pt
          ? "Link de importação copiado."
          : "Import link copied to clipboard.",
      );
      await incrementBankUsage(item.id);
    } catch {
      toast.error(
        pt ? "Não foi possível copiar." : "Couldn't copy to clipboard.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 rounded-full border border-border bg-background p-1 w-max">
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`rounded-full px-4 py-1 text-xs font-medium ${
            tab === "mine"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Lock className="mr-1 inline-block h-3 w-3" />
          {pt ? `Meu banco (${mine.length})` : `My bank (${mine.length})`}
        </button>
        <button
          type="button"
          onClick={() => setTab("public")}
          className={`rounded-full px-4 py-1 text-xs font-medium ${
            tab === "public"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="mr-1 inline-block h-3 w-3" />
          {pt
            ? `Banco público (${publicItems.length})`
            : `Public bank (${publicItems.length})`}
        </button>
      </nav>

      {cefrOptions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {pt ? "Filtrar por CEFR:" : "Filter by CEFR:"}
          </span>
          <button
            type="button"
            onClick={() => setCefrFilter("")}
            className={`rounded-full border px-2 py-0.5 ${
              cefrFilter === ""
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40"
            }`}
          >
            {pt ? "Todos" : "All"}
          </button>
          {cefrOptions.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCefrFilter(c)}
              className={`rounded-full border px-2 py-0.5 ${
                cefrFilter === c
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/40"
              }`}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          {tab === "mine" ? (
            <>
              <p className="text-sm font-medium">
                {pt ? "Seu banco está vazio" : "Your bank is empty"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pt ? (
                  <>
                    Abra qualquer exercício no editor de lições e clique em{" "}
                    <em>Salvar no banco</em> para reutilizá-lo em outras
                    lições.
                  </>
                ) : (
                  <>
                    Open any exercise in the lesson builder and click{" "}
                    <em>Save to bank</em> to reuse it across lessons.
                  </>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">
                {pt
                  ? "Ainda não há itens públicos neste nível"
                  : "Nothing public at this level yet"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pt
                  ? "Outros professores podem compartilhar exercícios aqui para ajudar a comunidade."
                  : "Other teachers can share exercises here to help the community."}
              </p>
            </>
          )}
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <BankCard
                item={item}
                isMine={tab === "mine"}
                pending={pending}
                onTogglePublic={() => togglePublic(item)}
                onRemove={() => remove(item)}
                onCopy={() => copyImportLink(item)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BankCard({
  item,
  isMine,
  pending,
  onTogglePublic,
  onRemove,
  onCopy,
}: {
  item: BankItemRow;
  isMine: boolean;
  pending: boolean;
  onTogglePublic: () => void;
  onRemove: () => void;
  onCopy: () => void;
}) {
  const preview =
    "question" in item.exercise
      ? item.exercise.question
      : "prompt_en" in item.exercise
        ? item.exercise.prompt_en
        : "prompt" in item.exercise
          ? item.exercise.prompt
          : "";
  return (
    <Card className="h-full">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{item.title}</p>
            <p className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
              {item.cefr_level ? (
                <Badge variant="outline" className="text-[10px]">
                  {item.cefr_level.toUpperCase()}
                </Badge>
              ) : null}
              <Badge variant="secondary" className="text-[10px]">
                {item.exercise.type.replace(/_/g, " ")}
              </Badge>
              {item.tags.slice(0, 3).map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </p>
          </div>
          <Badge
            variant={item.is_public ? "default" : "outline"}
            className="shrink-0 text-[10px]"
          >
            {item.is_public ? (
              <>
                <Globe className="mr-1 h-3 w-3" />
                Public
              </>
            ) : (
              <>
                <Lock className="mr-1 h-3 w-3" />
                Private
              </>
            )}
          </Badge>
        </div>
        {preview ? (
          <p className="line-clamp-3 rounded-md bg-muted/40 p-2 text-xs italic">
            {preview}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" />
            {item.uses_count} uses
          </span>
          <div className="flex items-center gap-1">
            {isMine ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onTogglePublic}
                  disabled={pending}
                  className="h-7 text-[11px]"
                >
                  {item.is_public ? "Make private" : "Publish"}
                </Button>
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={pending}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={onCopy}
                disabled={pending}
                className="h-7 text-[11px]"
              >
                Copy import link
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
