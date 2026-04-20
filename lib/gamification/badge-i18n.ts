import type { BadgeRarity } from "./config";
import type { Locale } from "@/lib/i18n/translations";

interface BadgeText {
  name: string;
  description: string;
}

const BADGE_I18N: Record<Locale, Record<string, BadgeText>> = {
  en: {
    welcome_aboard: {
      name: "First Contact",
      description: "Joined Amazing School — welcome!",
    },
    first_lesson: {
      name: "First Signal",
      description: "Completed your first lesson",
    },
    first_chat: {
      name: "Neural Handshake",
      description: "Started your first AI conversation",
    },
    five_lessons: {
      name: "Momentum",
      description: "Completed 5 lessons",
    },
    bookworm: {
      name: "Bookworm",
      description: "Completed 25 lessons",
    },
    streak_7: {
      name: "Ignited",
      description: "7-day streak",
    },
    streak_30: {
      name: "Unstoppable",
      description: "30-day streak",
    },
    streak_90: {
      name: "Quarter Orbit",
      description: "90-day streak",
    },
    music_lover: {
      name: "Soundwave",
      description: "Completed 5 music lessons",
    },
    level_5: {
      name: "Rising Signal",
      description: "Reached Level 5",
    },
    level_10: {
      name: "Constellation",
      description: "Reached Level 10",
    },
    level_25: {
      name: "Nova",
      description: "Reached Level 25",
    },
    level_50: {
      name: "Supernova",
      description: "Reached Level 50",
    },
    perfect_lesson: {
      name: "Clean Sweep",
      description: "Finished a lesson with zero mistakes",
    },
  },
  "pt-BR": {
    welcome_aboard: {
      name: "Primeiro Contato",
      description: "Entrou na Amazing School — boas-vindas!",
    },
    first_lesson: {
      name: "Primeiro Sinal",
      description: "Concluiu a primeira lição",
    },
    first_chat: {
      name: "Aperto de Mão Neural",
      description: "Iniciou sua primeira conversa com a IA",
    },
    five_lessons: {
      name: "Embalado",
      description: "Concluiu 5 lições",
    },
    bookworm: {
      name: "Rato de Biblioteca",
      description: "Concluiu 25 lições",
    },
    streak_7: {
      name: "Em Chamas",
      description: "Sequência de 7 dias",
    },
    streak_30: {
      name: "Imparável",
      description: "Sequência de 30 dias",
    },
    streak_90: {
      name: "Órbita Trimestral",
      description: "Sequência de 90 dias",
    },
    music_lover: {
      name: "Onda Sonora",
      description: "Concluiu 5 lições de música",
    },
    level_5: {
      name: "Sinal Crescente",
      description: "Chegou ao Nível 5",
    },
    level_10: {
      name: "Constelação",
      description: "Chegou ao Nível 10",
    },
    level_25: {
      name: "Nova",
      description: "Chegou ao Nível 25",
    },
    level_50: {
      name: "Supernova",
      description: "Chegou ao Nível 50",
    },
    perfect_lesson: {
      name: "Gabaritou",
      description: "Terminou uma lição sem errar nenhuma",
    },
  },
};

const RARITY_I18N: Record<Locale, Record<BadgeRarity, string>> = {
  en: {
    common: "Common",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
    mythic: "Mythic",
  },
  "pt-BR": {
    common: "Comum",
    rare: "Raro",
    epic: "Épico",
    legendary: "Lendário",
    mythic: "Mítico",
  },
};

export function translateBadge(
  type: string,
  locale: Locale,
  fallback: BadgeText,
): BadgeText {
  return BADGE_I18N[locale]?.[type] ?? BADGE_I18N.en[type] ?? fallback;
}

export function translateRarity(rarity: BadgeRarity, locale: Locale): string {
  return RARITY_I18N[locale]?.[rarity] ?? RARITY_I18N.en[rarity] ?? rarity;
}
