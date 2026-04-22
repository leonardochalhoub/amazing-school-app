"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  MapPin,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  addCommunityComment,
  createCommunityPost,
  deleteCommunityPost,
  listCommunityPosts,
  toggleCommunityLike,
  type CommunityPostRow,
} from "@/lib/actions/teacher-community";
import { useI18n } from "@/lib/i18n/context";

interface Props {
  initialPosts: CommunityPostRow[];
  me: { id: string; name: string | null; location: string | null };
}

function initials(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "").toUpperCase() +
    (parts[parts.length - 1]?.[0] ?? "").toUpperCase()
  ).slice(0, 2);
}

function formatRelative(iso: string, pt: boolean): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return pt ? "agora" : "just now";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return pt ? `há ${m} min` : `${m}m ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return pt ? `há ${h} h` : `${h}h ago`;
  }
  const d = Math.floor(diff / 86400);
  if (d < 30) return pt ? `há ${d} d` : `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function CommunityFeed({ initialPosts, me }: Props) {
  const { locale } = useI18n();
  const pt = locale === "pt-BR";
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPostRow[]>(initialPosts);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [offset, setOffset] = useState(initialPosts.length);
  const [noMore, setNoMore] = useState(initialPosts.length < 10);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  function publish() {
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await createCommunityPost({ body });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      setBody("");
      // Optimistic refresh — pull the latest 10 again.
      const fresh = await listCommunityPosts({ limit: 10 });
      setPosts(fresh);
      setOffset(fresh.length);
      setNoMore(fresh.length < 10);
      router.refresh();
    });
  }

  function loadMore() {
    startTransition(async () => {
      const next = await listCommunityPosts({ limit: 10, offset });
      if (next.length === 0) {
        setNoMore(true);
        return;
      }
      setPosts((p) => [...p, ...next]);
      setOffset((o) => o + next.length);
      if (next.length < 10) setNoMore(true);
    });
  }

  function like(id: string) {
    startTransition(async () => {
      const r = await toggleCommunityLike(id);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      const { liked } = r;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                liked_by_me: liked,
                like_count: p.like_count + (liked ? 1 : -1),
              }
            : p,
        ),
      );
    });
  }

  function submitComment(id: string) {
    const text = (commentDraft[id] ?? "").trim();
    if (!text) return;
    startTransition(async () => {
      const r = await addCommunityComment({ post_id: id, body: text });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      setCommentDraft((s) => ({ ...s, [id]: "" }));
      const fresh = await listCommunityPosts({
        limit: Math.max(10, posts.length),
      });
      setPosts(fresh);
    });
  }

  function remove(id: string) {
    if (!confirm(pt ? "Excluir publicação?" : "Delete post?")) return;
    startTransition(async () => {
      const r = await deleteCommunityPost(id);
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      {/* Composer */}
      <Card className="overflow-hidden border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-fuchsia-500/5">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-bold text-white">
              {initials(me.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {me.name ?? (pt ? "Você" : "You")}
              </p>
              {me.location ? (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {me.location}
                </p>
              ) : null}
            </div>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={
              pt
                ? "O que está ensinando hoje? Compartilhe com a comunidade…"
                : "What are you teaching today? Share with the community…"
            }
            className="w-full rounded-xl border border-border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">
              {body.length}/2000
            </p>
            <Button
              size="sm"
              onClick={publish}
              disabled={pending || !body.trim()}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              {pending ? (pt ? "Publicando…" : "Publishing…") : pt ? "Publicar" : "Post"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            {pt ? "Ninguém postou ainda. Seja o primeiro!" : "Nobody has posted yet. Be the first!"}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {posts.map((p) => (
            <li key={p.id}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 via-pink-500 to-violet-500 text-xs font-bold text-white">
                      {initials(p.author_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {p.author_name ?? (pt ? "Professor" : "Teacher")}
                        </p>
                        {p.author_role === "owner" ? (
                          <Badge variant="default" className="text-[10px]">
                            Sysadmin
                          </Badge>
                        ) : null}
                      </div>
                      <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        {p.author_location ? (
                          <>
                            <MapPin className="h-3 w-3" />
                            {p.author_location}
                            <span className="mx-0.5">·</span>
                          </>
                        ) : null}
                        <span title={new Date(p.created_at).toLocaleString()}>
                          {formatRelative(p.created_at, pt)}
                        </span>
                      </p>
                    </div>
                    {p.author_id === me.id ? (
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        disabled={pending}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                    {p.body}
                  </p>

                  {p.linked_entry_id && p.linked_entry_title ? (
                    <Link
                      href={`/teacher/bank?view=lessons&q=${encodeURIComponent(p.linked_entry_title)}`}
                      className="block rounded-lg border border-border bg-muted/40 p-2 text-xs hover:border-primary/40"
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {pt ? "Lição do banco" : "Bank lesson"}
                      </span>
                      <p className="truncate font-medium">{p.linked_entry_title}</p>
                    </Link>
                  ) : null}

                  <div className="flex items-center gap-4 pt-1">
                    <button
                      type="button"
                      onClick={() => like(p.id)}
                      disabled={pending}
                      className={`inline-flex items-center gap-1 text-xs transition-colors ${
                        p.liked_by_me
                          ? "text-rose-500"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 ${p.liked_by_me ? "fill-current" : ""}`}
                      />
                      {p.like_count > 0 ? p.like_count : pt ? "Curtir" : "Like"}
                    </button>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      {p.comments.length}
                    </span>
                  </div>

                  {p.comments.length > 0 ? (
                    <ul className="space-y-2 border-l-2 border-border/60 pl-3">
                      {p.comments.map((c) => (
                        <li key={c.id} className="text-xs">
                          <p className="text-[11px] font-semibold">
                            {c.author_name ?? (pt ? "Professor" : "Teacher")}{" "}
                            {c.author_location ? (
                              <span className="text-[10px] font-normal text-muted-foreground">
                                · {c.author_location}
                              </span>
                            ) : null}
                            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                              · {formatRelative(c.created_at, pt)}
                            </span>
                          </p>
                          <p className="whitespace-pre-wrap">{c.body}</p>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={commentDraft[p.id] ?? ""}
                      onChange={(e) =>
                        setCommentDraft((s) => ({ ...s, [p.id]: e.target.value }))
                      }
                      placeholder={pt ? "Comentar…" : "Add a comment…"}
                      className="h-8 flex-1 rounded-full border border-border bg-background px-3 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitComment(p.id);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => submitComment(p.id)}
                      disabled={pending || !(commentDraft[p.id] ?? "").trim()}
                      className="h-8 text-[11px]"
                    >
                      {pt ? "Enviar" : "Send"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {!noMore ? (
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={loadMore}
            disabled={pending}
            className="gap-1.5"
          >
            + {pt ? "Mostrar mais" : "Show more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
