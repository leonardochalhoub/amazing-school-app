export const teacherTokens = {
  scope: "theme-teacher",
  palette: {
    accent: "hsl(215 15% 35%)",
    accentAlt: "hsl(215 10% 50%)",
    chart: [
      "hsl(215 15% 35%)",
      "hsl(215 10% 50%)",
      "hsl(215 8% 65%)",
      "hsl(215 5% 80%)",
      "hsl(215 20% 25%)",
    ],
  },
  density: 0.85,
  radius: "0.375rem",
} as const;

export type TeacherTokens = typeof teacherTokens;
