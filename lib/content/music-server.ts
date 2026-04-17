import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MusicSong } from "@/lib/content/music";

export async function loadMusicSong(slug: string): Promise<MusicSong | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const filePath = path.join(
      process.cwd(),
      "content",
      "music",
      "songs",
      `${slug}.json`
    );
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as MusicSong;
  } catch {
    return null;
  }
}
