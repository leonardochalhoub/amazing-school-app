"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

interface Props {
  /** Default value shown on first paint — typically the `q` URL param. */
  initialValue?: string;
  /** Debounce before writing the new value to the URL. Lower = snappier. */
  debounceMs?: number;
  placeholder?: string;
}

/**
 * Text search bar for the lessons page. Pushes `?q=<value>` to the URL
 * (preserving all other params) so the server component can re-filter
 * against lesson title / slug / category / cefr.
 */
export function LessonSearchInput({
  initialValue = "",
  debounceMs = 250,
  placeholder = "Search lessons…",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  // Track whether the current value came from user input vs URL sync so
  // we don't fire an extra router.push when switching routes.
  const initialRef = useRef(initialValue);

  useEffect(() => {
    if (value === initialRef.current) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed.length === 0) next.delete("q");
      else next.set("q", trimmed);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
      initialRef.current = value;
    }, debounceMs);
    return () => clearTimeout(t);
  }, [value, debounceMs, pathname, router, searchParams]);

  return (
    <div className="relative flex w-full min-w-0 flex-1 items-center sm:min-w-[220px]">
      <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full rounded-full border border-border bg-background pl-8 pr-8 text-[12px] outline-none ring-0 transition-colors placeholder:text-muted-foreground focus:border-foreground/50"
      />
      {value.length > 0 ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setValue("")}
          className="absolute right-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}
