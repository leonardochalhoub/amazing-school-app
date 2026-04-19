/**
 * Public landing-page demo account presets. Photos are the original
 * Unsplash URLs (public, hotlink-safe) so the landing page renders
 * without a signed Supabase URL. The in-app avatars still use the
 * private Supabase bucket + signed URLs.
 */
export const DEMO_PRESETS = {
  teacher: {
    email: "demo.luiza@amazingschool.app",
    displayName: "Luiza Martins",
    role: "teacher" as const,
    photo:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=faces&auto=format&q=80",
  },
  student: {
    // Ana — the A2 teen from Luiza's A1/A2 Morning Starter classroom.
    email: "demo.ana@amazingschool.app",
    displayName: "Ana Costa",
    role: "student" as const,
    photo:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces&auto=format&q=80",
  },
} as const;

export type DemoKind = keyof typeof DEMO_PRESETS;
