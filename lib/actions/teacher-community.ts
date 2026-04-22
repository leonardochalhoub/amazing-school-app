"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTeacherRole } from "@/lib/auth/roles";

export interface CommunityPostRow {
  id: string;
  author_id: string;
  author_name: string | null;
  author_location: string | null;
  author_avatar_url: string | null;
  author_role: "teacher" | "owner" | null;
  body: string;
  linked_entry_id: string | null;
  linked_entry_title: string | null;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
  comments: Array<{
    id: string;
    author_id: string;
    author_name: string | null;
    author_location: string | null;
    author_avatar_url: string | null;
    body: string;
    created_at: string;
  }>;
}

/** Fetch the latest posts, newest first. */
export async function listCommunityPosts(opts?: {
  limit?: number;
  offset?: number;
}): Promise<CommunityPostRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();

  const limit = opts?.limit ?? 10;
  const offset = opts?.offset ?? 0;

  const { data: posts } = await admin
    .from("teacher_community_posts")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  const rows = (posts ?? []) as Array<{
    id: string;
    author_id: string;
    body: string;
    linked_entry_id: string | null;
    created_at: string;
  }>;
  if (rows.length === 0) return [];

  const postIds = rows.map((r) => r.id);
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const entryIds = Array.from(
    new Set(
      rows.map((r) => r.linked_entry_id).filter((x): x is string => !!x),
    ),
  );

  const [profilesRes, likesRes, commentsRes, entriesRes, myLikesRes] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, full_name, avatar_url, location, role")
        .in("id", authorIds),
      admin
        .from("teacher_community_likes")
        .select("post_id, user_id")
        .in("post_id", postIds),
      admin
        .from("teacher_community_comments")
        .select("*")
        .in("post_id", postIds)
        .order("created_at", { ascending: true }),
      admin
        .from("lesson_bank_entries")
        .select("id, title")
        .in(
          "id",
          entryIds.length > 0 ? entryIds : ["00000000-0000-0000-0000-000000000000"],
        ),
      admin
        .from("teacher_community_likes")
        .select("post_id")
        .eq("user_id", user.id),
    ]);

  const profiles = (profilesRes.data ?? []) as Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    location: string | null;
    role: string | null;
  }>;
  const profileById = new Map<string, (typeof profiles)[number]>();
  for (const p of profiles) profileById.set(p.id, p);

  // Also need comment-author profiles.
  const comments = (commentsRes.data ?? []) as Array<{
    id: string;
    post_id: string;
    author_id: string;
    body: string;
    created_at: string;
  }>;
  const commentAuthorIds = Array.from(new Set(comments.map((c) => c.author_id)));
  const missingIds = commentAuthorIds.filter((id) => !profileById.has(id));
  if (missingIds.length > 0) {
    const { data: more } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url, location, role")
      .in("id", missingIds);
    for (const p of (more ?? []) as typeof profiles) {
      profileById.set(p.id, p);
    }
  }

  const likeCountByPost = new Map<string, number>();
  for (const l of (likesRes.data ?? []) as Array<{
    post_id: string;
    user_id: string;
  }>) {
    likeCountByPost.set(l.post_id, (likeCountByPost.get(l.post_id) ?? 0) + 1);
  }
  const myLikedSet = new Set<string>(
    ((myLikesRes.data ?? []) as Array<{ post_id: string }>).map((x) => x.post_id),
  );

  const entryTitleById = new Map<string, string>();
  for (const e of (entriesRes.data ?? []) as Array<{ id: string; title: string }>) {
    entryTitleById.set(e.id, e.title);
  }

  const commentsByPost = new Map<string, typeof comments>();
  for (const c of comments) {
    const arr = commentsByPost.get(c.post_id) ?? [];
    arr.push(c);
    commentsByPost.set(c.post_id, arr);
  }

  // Avatars live in the private `avatars` bucket, so we sign each
  // author's image with the admin client here. RLS on the bucket
  // lets only classmates + teachers read peer avatars; the community
  // feed is cross-classroom, so we bypass that via the service role.
  const signedAvatarByUser = new Map<string, string>();
  const authorsWithAvatar = Array.from(profileById.entries()).filter(
    ([, p]) => (p.avatar_url ?? "").length > 0,
  );
  if (authorsWithAvatar.length > 0) {
    const signed = await Promise.all(
      authorsWithAvatar.map(async ([id]) => {
        try {
          const { data } = await admin.storage
            .from("avatars")
            .createSignedUrl(`${id}.webp`, 3600);
          return [id, data?.signedUrl ?? null] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    );
    for (const [id, url] of signed) {
      if (url) signedAvatarByUser.set(id, url);
    }
  }

  return rows.map((r) => {
    const p = profileById.get(r.author_id);
    return {
      id: r.id,
      author_id: r.author_id,
      author_name: p?.full_name ?? null,
      author_location: p?.location ?? null,
      author_avatar_url: signedAvatarByUser.get(r.author_id) ?? null,
      author_role:
        p?.role === "teacher" || p?.role === "owner" ? p.role : null,
      body: r.body,
      linked_entry_id: r.linked_entry_id,
      linked_entry_title: r.linked_entry_id
        ? entryTitleById.get(r.linked_entry_id) ?? null
        : null,
      created_at: r.created_at,
      like_count: likeCountByPost.get(r.id) ?? 0,
      liked_by_me: myLikedSet.has(r.id),
      comments: (commentsByPost.get(r.id) ?? []).map((c) => {
        const cp = profileById.get(c.author_id);
        return {
          id: c.id,
          author_id: c.author_id,
          author_name: cp?.full_name ?? null,
          author_location: cp?.location ?? null,
          author_avatar_url: signedAvatarByUser.get(c.author_id) ?? null,
          body: c.body,
          created_at: c.created_at,
        };
      }),
    };
  });
}

export async function createCommunityPost(input: {
  body: string;
  linked_entry_id?: string;
}): Promise<{ success: true; id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!isTeacherRole(profile?.role as string | null | undefined)) {
    return { error: "Only teachers can post." };
  }
  const body = input.body.trim();
  if (!body) return { error: "Post body required." };
  if (body.length > 2000) return { error: "Post too long (max 2000)." };

  const { data, error } = await admin
    .from("teacher_community_posts")
    .insert({
      author_id: user.id,
      body,
      linked_entry_id: input.linked_entry_id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/teacher/community");
  return { success: true, id: (data as { id: string }).id };
}

export async function toggleCommunityLike(
  postId: string,
): Promise<{ success: true; liked: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("teacher_community_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    await admin
      .from("teacher_community_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    revalidatePath("/teacher/community");
    return { success: true, liked: false };
  }
  const { error } = await admin
    .from("teacher_community_likes")
    .insert({ post_id: postId, user_id: user.id });
  if (error) return { error: error.message };
  revalidatePath("/teacher/community");
  return { success: true, liked: true };
}

export async function addCommunityComment(input: {
  post_id: string;
  body: string;
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const admin = createAdminClient();
  const body = input.body.trim();
  if (!body) return { error: "Comment required." };
  const { error } = await admin.from("teacher_community_comments").insert({
    post_id: input.post_id,
    author_id: user.id,
    body: body.slice(0, 1000),
  });
  if (error) return { error: error.message };
  revalidatePath("/teacher/community");
  return { success: true };
}

export async function deleteCommunityPost(
  postId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const admin = createAdminClient();
  const { data: p } = await admin
    .from("teacher_community_posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();
  if (!p) return { error: "Not found." };
  if ((p as { author_id: string }).author_id !== user.id) {
    return { error: "Only the author can delete this post." };
  }
  await admin.from("teacher_community_posts").delete().eq("id", postId);
  revalidatePath("/teacher/community");
  return { success: true };
}
