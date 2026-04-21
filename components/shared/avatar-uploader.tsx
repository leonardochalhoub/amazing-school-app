"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadAvatar, removeAvatar } from "@/lib/actions/avatars";
import {
  CartoonAvatar,
  type AgeGroup,
  type Gender,
} from "@/components/shared/cartoon-avatar";
import { useI18n } from "@/lib/i18n/context";

interface AvatarUploaderProps {
  currentSignedUrl?: string | null;
  fullName: string;
  userId?: string;
  ageGroup?: AgeGroup | null;
  gender?: Gender | null;
}

export function AvatarUploader({
  currentSignedUrl,
  fullName,
  userId,
  ageGroup,
  gender,
}: AvatarUploaderProps) {
  const router = useRouter();
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pick() {
    inputRef.current?.click();
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);

    const fd = new FormData();
    fd.append("file", file);

    startTransition(async () => {
      const result = await uploadAvatar(fd);
      if ("error" in result && result.error) {
        toast.error(result.error);
        setPreview(null);
      } else {
        toast.success(pt ? "Foto atualizada" : "Avatar updated");
        router.refresh();
      }
    });
  }

  function onRemove() {
    startTransition(async () => {
      const result = await removeAvatar();
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setPreview(null);
        toast.success(pt ? "Foto removida" : "Avatar removed");
        router.refresh();
      }
    });
  }

  const displayed = preview ?? currentSignedUrl ?? null;
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-28 w-28 overflow-hidden rounded-full bg-muted ring-4 ring-background shadow-md flex items-center justify-center text-2xl font-semibold">
        {displayed ? (
          <Image
            src={displayed}
            alt={fullName}
            fill
            sizes="112px"
            className="object-cover"
            unoptimized
          />
        ) : ageGroup || gender ? (
          <CartoonAvatar
            ageGroup={ageGroup ?? null}
            gender={gender ?? null}
            seed={userId ?? fullName}
            fullName={fullName}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onChange}
      />
      <div className="flex w-40 flex-col gap-1.5">
        <Button
          type="button"
          size="sm"
          onClick={pick}
          disabled={pending}
          className="w-full gap-1.5"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          {pending
            ? pt
              ? "Enviando…"
              : "Uploading…"
            : pt
              ? "Trocar foto"
              : "Change photo"}
        </Button>
        {currentSignedUrl ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRemove}
            disabled={pending}
            className="w-full gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {pt ? "Remover" : "Remove"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
