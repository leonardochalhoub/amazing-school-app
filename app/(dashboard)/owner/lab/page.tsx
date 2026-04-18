import { redirect } from "next/navigation";
import { isOwner } from "@/lib/auth/roles";
import { AudioLabClient } from "@/components/owner/audio-lab-client";

export default async function OwnerAudioLabPage() {
  const owner = await isOwner();
  if (!owner) redirect("/");

  return (
    <div className="space-y-6 pb-16">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Owner · Lab
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Pronunciation Lab
        </h1>
        <p className="text-sm text-muted-foreground">
          Free-form experimentation against Groq Whisper. Set a target phrase,
          record yourself, see the transcription, the raw Levenshtein distance,
          and the similarity score.
        </p>
      </header>

      <AudioLabClient />
    </div>
  );
}
