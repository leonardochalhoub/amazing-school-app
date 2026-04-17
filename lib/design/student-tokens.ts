export const studentTokens = {
  scope: "theme-student",
  palette: {
    accent: "hsl(142 70% 45%)",
    accentAlt: "hsl(262 70% 60%)",
    chart: [
      "hsl(142 70% 45%)",
      "hsl(262 70% 60%)",
      "hsl(42 95% 55%)",
      "hsl(340 80% 60%)",
      "hsl(200 80% 55%)",
    ],
  },
  density: 1,
  radius: "0.75rem",
} as const;

export type StudentTokens = typeof studentTokens;
