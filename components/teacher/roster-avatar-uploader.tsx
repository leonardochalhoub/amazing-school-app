"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  CartoonAvatar,
  type AgeGroup,
  type Gender,
} from "@/components/shared/cartoon-avatar";
import {
  uploadRosterAvatar,
  removeRosterAvatar,
} from "@/lib/actions/roster";

interface Props {
  rosterId: string;
  currentSignedUrl?: string | null;
  fullName: string;
  ageGroup?: AgeGroup | null;
  gender?: Gender | null;
}

export function RosterAvatarUploader({
  rosterId,
  currentSignedUrl,
  fullName,
  ageGroup,
  gender,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);

    const fd = new FormData();
    fd.append("file", file);

    startTransition(async () => {
      const result = await uploadRosterAvatar(rosterId, fd);
      if ("error" in result && result.error) {
        toast.error(result.error);
        setPreview(null);
      } else {
        toast.success("Photo updated");
      }
    });
  }

  function onRemove() {
    startTransition(async () => {
      const result = await removeRosterAvatar(rosterId);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        setPreview(null);
        toast.success("Photo removed");
      }
    });
  }

  const displayed = preview ?? currentSignedUrl ?? null;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted ring-2 ring-background">
        {displayed ? (
          <Image
            src={displayed}
            alt={fullName}
            fill
            sizes="96px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="h-full w-full">
            <CartoonAvatar
              ageGroup={ageGroup}
              gender={gender}
              seed={rosterId}
              fullName={fullName}
            />
          </div>
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
        <Button
          type="button"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="gap-1.5"
        >
          <Camera className="h-4 w-4" />
          {pending ? "Uploading…" : currentSignedUrl ? "Change photo" : "Upload photo"}
        </Button>
        {currentSignedUrl ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRemove}
            disabled={pending}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          Max 5 MB · JPEG, PNG, or WebP · resized to 512×512.
        </p>
      </div>
    </div>
  );
}
