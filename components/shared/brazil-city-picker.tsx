"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  loadBrazilCities,
  matchCity,
  type BrazilCity,
} from "@/lib/data/brazil-cities";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Capped by the consumer's max length — 80 in our case. */
  maxLength?: number;
}

/**
 * Combobox for Brazilian municipalities. The list (~5.5k cities) is
 * fetched lazily from the IBGE API on first focus and cached in
 * sessionStorage, so the initial page load stays light.
 *
 * Non-Brazilian students can still type anywhere in the world — the
 * picker is additive: any value submitted is kept verbatim, with the
 * dropdown only offering Brazilian matches.
 */
export function BrazilCityPicker({
  value,
  onChange,
  disabled,
  placeholder,
  maxLength = 80,
}: Props) {
  const [cities, setCities] = useState<BrazilCity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Guard only on `cities` — not on `loading`. In React 19 StrictMode
    // the effect mounts, cleans up, then remounts; if we also gated on
    // `loading` the remount would short-circuit while the first mount's
    // fetch was still in flight, leaving `loading` stuck at true.
    if (cities) return;
    if (!open) return;
    let alive = true;
    setLoading(true);
    loadBrazilCities()
      .then((rows) => {
        if (!alive) return;
        setCities(rows);
      })
      .finally(() => {
        // Unconditional — even after unmount we want loading to flip,
        // so a subsequent mount doesn't inherit a stale true.
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, cities]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const matches = useMemo(() => {
    if (!cities) return [];
    const q = value.trim();
    // When the input is empty, suggest nothing until the user types —
    // a 5k-row dropdown on focus is worse than silence.
    if (!q) return [];
    const filtered: BrazilCity[] = [];
    for (const c of cities) {
      if (matchCity(c, q)) {
        filtered.push(c);
        if (filtered.length >= 20) break;
      }
    }
    return filtered;
  }, [cities, value]);

  function commit(c: BrazilCity) {
    onChange(`${c.name}, ${c.uf}`);
    setOpen(false);
    setActiveIdx(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const picked = matches[activeIdx];
      if (picked) {
        e.preventDefault();
        commit(picked);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIdx(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
      />
      {open && value.trim() && matches.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-lg"
        >
          {matches.map((c, i) => (
            <li
              key={`${c.name}-${c.uf}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => {
                // onMouseDown fires before onBlur so the click lands
                // before the dropdown closes on container blur.
                e.preventDefault();
                commit(c);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                "cursor-pointer rounded px-2 py-1.5",
                i === activeIdx
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50",
              )}
            >
              <span className="font-medium">{c.name}</span>
              <span className="ml-1 text-xs text-muted-foreground">
                {c.uf}
              </span>
            </li>
          ))}
        </ul>
      ) : open && value.trim() && loading ? (
        <p className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-lg">
          Carregando cidades…
        </p>
      ) : null}
    </div>
  );
}
