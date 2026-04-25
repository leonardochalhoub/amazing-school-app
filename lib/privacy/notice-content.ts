/**
 * The honest privacy story shown to every teacher and student. Keep it
 * accurate — editing this file is the authoritative source for what we
 * store and why. If the data model changes, update this copy first.
 */

export type PrivacyBullet = {
  topic: { en: string; pt: string };
  body: { en: string; pt: string };
};

export const PRIVACY_SECTIONS: {
  title: { en: string; pt: string };
  bullets: PrivacyBullet[];
}[] = [
  {
    title: {
      en: "What we do store",
      pt: "O que armazenamos",
    },
    bullets: [
      {
        topic: { en: "Account basics", pt: "Dados de conta" },
        body: {
          en: "Email, name, role, and your profile photo. Needed to log you in and show you to your teacher or classmates.",
          pt: "E-mail, nome, tipo de usuário e sua foto. Usados para autenticar você e te identificar para sua professora ou colegas.",
        },
      },
      {
        topic: {
          en: "Learning footprint",
          pt: "Registro de aprendizado",
        },
        body: {
          en: "Lessons assigned, exercises you answered, XP earned, daily activity, and badges. This powers your streak, the leaderboard, and your teacher's view of how you're doing.",
          pt: "Lições atribuídas, exercícios respondidos, XP ganho, atividade diária e medalhas. Isso alimenta seu streak, o ranking e o acompanhamento da professora.",
        },
      },
      {
        topic: {
          en: "AI chat history",
          pt: "Histórico do chat com IA",
        },
        body: {
          en: "Your messages to the AI tutor are saved so the conversation can continue where you left off. Only you can read them — your teacher does NOT see your AI chats.",
          pt: "Suas mensagens com a IA são salvas para que a conversa continue de onde parou. Somente você pode lê-las — sua professora NÃO vê suas conversas com a IA.",
        },
      },
      {
        topic: {
          en: "Teacher-only notes",
          pt: "Anotações da professora",
        },
        body: {
          en: "If your teacher writes diary or class notes about your progress, they live inside their own dashboard — visible only to the teacher who wrote them.",
          pt: "Anotações de diário e histórico que a professora faz sobre seu progresso ficam visíveis apenas para ela.",
        },
      },
      {
        topic: {
          en: "Tuition records",
          pt: "Registros de mensalidade",
        },
        body: {
          en: "If your teacher tracks tuition here, amounts and payment status are stored inside her private Finance tab. No one else on the platform sees them — including the platform owner.",
          pt: "Se sua professora controla a mensalidade aqui, valores e status de pagamento ficam somente na aba Financeiro dela. Ninguém mais na plataforma vê — nem a pessoa que mantém o site.",
        },
      },
    ],
  },
  {
    title: {
      en: "What we don't do",
      pt: "O que não fazemos",
    },
    bullets: [
      {
        topic: { en: "No third-party sale", pt: "Nada é vendido" },
        body: {
          en: "We do not sell, rent, or share personal data with advertisers or data brokers. Ever.",
          pt: "Não vendemos, alugamos, nem compartilhamos dados pessoais com anunciantes ou data brokers. Nunca.",
        },
      },
      {
        topic: {
          en: "No AI training on your data",
          pt: "Seus dados não treinam IA",
        },
        body: {
          en: "Your chats with the AI tutor are sent to Anthropic / Google only to produce the reply and then dropped by the model provider — they are not used to train foundation models.",
          pt: "Suas conversas com a IA são enviadas à Anthropic / Google apenas para gerar a resposta e depois descartadas — não viram dado de treino.",
        },
      },
      {
        topic: {
          en: "No hidden sensors",
          pt: "Sem coleta oculta",
        },
        body: {
          en: "No location tracking, no microphone outside the speaking-lab session you started, no third-party analytics cookies.",
          pt: "Sem rastreamento de localização, sem uso do microfone fora de uma sessão de fala iniciada por você, sem cookies de analytics de terceiros.",
        },
      },
    ],
  },
  {
    title: {
      en: "Who can see what",
      pt: "Quem vê o quê",
    },
    bullets: [
      {
        topic: { en: "You", pt: "Você" },
        body: {
          en: "You can read and export everything we store about you. Deletion is one email away.",
          pt: "Você pode ler e exportar tudo o que guardamos sobre você. Para deletar, basta pedir por e-mail.",
        },
      },
      {
        topic: { en: "Your teacher", pt: "Sua professora" },
        body: {
          en: "Sees the students enrolled in their own classrooms: your assigned lessons, exercise responses, XP, attendance, and any notes they write. Your AI tutor chats are NOT visible to the teacher.",
          pt: "Vê apenas os alunos das próprias turmas: lições atribuídas, respostas dos exercícios, XP, frequência e anotações que ela mesma escreveu. Suas conversas com a IA NÃO ficam visíveis para a professora.",
        },
      },
      {
        topic: { en: "Platform owner", pt: "Mantenedor da plataforma" },
        body: {
          en: "Sees only aggregate counts (daily actives, catalog size, platform growth). No per-student tuition, no chat content, no teacher-to-student revenue — the admin dashboard is built to NOT query those columns.",
          pt: "Vê apenas números agregados (usuários ativos, tamanho do catálogo, crescimento). Não vê mensalidades por aluno, conteúdo de chats ou receita por professora — o painel admin é explicitamente construído para NÃO consultar esses dados.",
        },
      },
    ],
  },
];

export const PRIVACY_TAGLINE = {
  en: "We collect only what keeps the classroom working, and we don't monetise it.",
  pt: "Só guardamos o necessário para a aula funcionar — e nada disso é monetizado.",
};
