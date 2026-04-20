"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface Item {
  key: string | number;
  node: ReactNode;
}

interface Props {
  items: Item[];
  initial: number;
  /** Classes applied to the outer list container. Defaults to a stacked
   *  divider — can be overridden when the caller wants cards. */
  listClassName?: string;
}

export function ExpandableList({ items, initial, listClassName }: Props) {
  const { locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const overflow = items.length - initial;
  const visible = expanded ? items : items.slice(0, initial);

  const t = locale === "pt-BR"
    ? {
        showMore: (n: number) => `Ver mais ${n}`,
        showLess: "Ver menos",
      }
    : {
        showMore: (n: number) => `Show ${n} more`,
        showLess: "Show less",
      };

  return (
    <div className="space-y-2">
      <ul className={listClassName ?? "text-sm divide-y divide-border"}>
        {visible.map((item) => (
          <li key={item.key}>{item.node}</li>
        ))}
      </ul>
      {overflow > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <Plus
            className={`h-3 w-3 transition-transform ${
              expanded ? "rotate-45" : ""
            }`}
          />
          {expanded ? t.showLess : t.showMore(overflow)}
        </button>
      ) : null}
    </div>
  );
}
