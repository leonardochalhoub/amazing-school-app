import { Music2 } from "lucide-react";
import { listMusic } from "@/lib/content/music";
import { MusicCatalog } from "@/components/shared/music-catalog";

export default function StudentMusicIndex() {
  const songs = listMusic();

  return (
    <div className="space-y-8 overflow-x-clip pb-16">
      <header className="flex flex-col gap-1">
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Music2 className="h-3.5 w-3.5" />
          <span>Songs catalog</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Songs</h1>
        <p className="text-sm text-muted-foreground">
          {songs.length} songs · learn English through real tracks with
          exercises and synced captions.
        </p>
      </header>

      <MusicCatalog songs={songs} variant="student" />
    </div>
  );
}
