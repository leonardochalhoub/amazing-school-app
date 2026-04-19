"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadAvatar, removeAvatar } from "@/lib/actions/avatars";
import {
  CartoonAvatar,
  type AgeGroup,
  type Gender,
} from "@/components/shared/cartoon-avatar";

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
        toast.success("Avatar updated");
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
        toast.success("Avatar removed");
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
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-muted flex items-center justify-center text-xl font-medium">
        {displayed ? (
          <Image
            src={displayed}
            alt={fullName}
            fill
            sizes="80px"
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
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onChange}
        />
        <Button type="button" onClick={pick} disabled={pending}>
          {pending ? "Uploading…" : "Change photo"}
        </Button>
        {currentSignedUrl ? (
          <Button type="button" variant="outline" onClick={onRemove} disabled={pending}>
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}
