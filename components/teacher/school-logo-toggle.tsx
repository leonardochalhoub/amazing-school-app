"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, Upload, Trash2 } from "lucide-react";
import {
  removeSchoolLogo,
  setSchoolLogoEnabled,
  uploadSchoolLogo,
} from "@/lib/actions/school-logo";
import { schoolLogoPublicUrl } from "@/lib/school-logo";

interface Props {
  initialEnabled: boolean;
  /** Bundled logo path — set for whitelisted teachers (Leo / Tatiana). */
  whitelistLogoSrc: string | null;
  /** Storage object path on the `school-logos` bucket, or null. */
  uploadedLogoPath: string | null;
}

export function SchoolLogoToggle({
  initialEnabled,
  whitelistLogoSrc,
  uploadedLogoPath,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [localUploadedUrl, setLocalUploadedUrl] = useState<string | null>(
    schoolLogoPublicUrl(uploadedLogoPath),
  );
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // An uploaded logo always wins over the bundled whitelist asset.
  // Whitelisted teachers just ship with one pre-set as a default —
  // they can replace it at any time by uploading a new image.
  const isWhitelisted = !!whitelistLogoSrc;
  const activeSrc = localUploadedUrl ?? whitelistLogoSrc;
  const hasLogo = !!activeSrc;
  const usingUpload = !!localUploadedUrl;

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const res = await setSchoolLogoEnabled(next);
      if ("error" in res && res.error) {
        toast.error(res.error);
        setEnabled(!next);
        return;
      }
      toast.success(next ? "Logo enabled" : "Logo disabled");
    });
  }

  function pickFile() {
    fileInputRef.current?.click();
  }

  function upload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const res = await uploadSchoolLogo(formData);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Logo uploaded");
      // Hard reload so the SSR navbar picks up school_logo_url +
      // school_logo_enabled on the next request.
      window.location.reload();
    });
  }

  function remove() {
    if (!confirm("Remove your school logo? The navbar will go back to Amazing School.")) return;
    startTransition(async () => {
      const res = await removeSchoolLogo();
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setLocalUploadedUrl(null);
      toast.success("Logo removed");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        When on, the image below appears centered at the top of every
        page you're signed into, and your students see it too. It
        replaces the default Amazing School wordmark until you turn it
        off.
      </p>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card/60 p-3">
        <div className="flex h-16 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeSrc!}
              alt="School brand preview"
              className={`max-h-14 w-auto object-contain transition-opacity ${enabled ? "opacity-100" : "opacity-30"}`}
            />
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              No logo yet
            </span>
          )}
        </div>
        <div className="flex-1 min-w-[180px]">
          <p className="text-sm font-semibold">
            {!hasLogo
              ? "Upload your logo"
              : enabled
                ? "Showing on the navbar"
                : "Hidden"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {usingUpload
              ? "Your upload · PNG / JPG / WebP / SVG · up to 8 MB"
              : isWhitelisted
                ? "Bundled default · upload your own to replace it"
                : "Drop in a PNG, JPG, WebP, or SVG. We auto-resize to fit the navbar."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={pickFile}
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {hasLogo ? "Replace" : "Upload"}
          </button>
          {usingUpload ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-50"
              title={
                isWhitelisted
                  ? "Delete your upload and go back to the bundled logo"
                  : "Delete your logo"
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isWhitelisted ? "Revert" : "Remove"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggle}
            disabled={pending || !hasLogo}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-medium transition-colors ${
              enabled && hasLogo
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                : "border-border bg-background text-foreground hover:bg-muted disabled:opacity-50"
            }`}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            {enabled ? "Disable" : "Enable"}
          </button>
        </div>
      </div>
    </div>
  );
}
