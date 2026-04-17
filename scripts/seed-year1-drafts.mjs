import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const COURSE_ID = "year-1-us-english-2026";

async function upsert(row) {
  const res = await fetch(`${URL}/rest/v1/lesson_drafts?on_conflict=slug`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    console.error(`✗ ${row.slug}:`, res.status, await res.text());
    return false;
  }
  console.log(`✓ ${row.slug}`);
  return true;
}

const LESSONS = [
  {
    slug: "a1-1-grammar-verb-to-be",
    cefr_level: "a1.1",
    category: "grammar",
    character_ids: ["maria", "mrs-johnson", "tom"],
    content: {
      slug: "a1-1-grammar-verb-to-be",
      title: "Verb TO BE — I am, you are, she is",
      description:
        "Maria meets her new classmates at Lincoln High. Learn to say who you are and where you're from.",
      category: "grammar",
      level: "A1",
      cefr_level: "a1.1",
      course_id: COURSE_ID,
      character_ids: ["maria", "mrs-johnson", "tom"],
      xp_reward: 25,
      estimated_minutes: 12,
      summary_pt_br:
        "Verbo TO BE no presente — I am / you are / he is / she is / it is / we are / they are. A Maria se apresenta na escola.",
      generator_model: "claude-opus-4-7",
      generated_at: new Date().toISOString(),
      exercises: [
        {
          id: "tb-001",
          type: "multiple_choice",
          question: 'Maria: "Hi! I ___ Maria. Nice to meet you."',
          options: ["am", "is", "are", "be"],
          correct: 0,
          explanation: "Use 'am' with 'I' in present tense: I am / I'm.",
          hint_pt_br: "Com 'I' usamos sempre 'am'. I am = Eu sou / Eu estou.",
        },
        {
          id: "tb-002",
          type: "multiple_choice",
          question: 'Mrs. Johnson says: "Class, this ___ Maria. She is from Brazil."',
          options: ["am", "is", "are", "be"],
          correct: 1,
          explanation: "Use 'is' with he / she / it / this / that (singular, third person).",
          hint_pt_br: "Com he/she/it/this/that (terceira pessoa do singular) usamos 'is'.",
        },
        {
          id: "tb-003",
          type: "fill_blank",
          question: 'Tom: "We ___ classmates. Welcome!" (use contraction)',
          correct: "'re",
          explanation: "'We are' contracts to 'we're'. Pronounced /wɪər/.",
          hint_pt_br: "'We are' vira 'we're' na forma contraída.",
        },
        {
          id: "tb-004",
          type: "matching",
          pairs: [
            ["I am a student", "Eu sou estudante"],
            ["She is from Brazil", "Ela é do Brasil"],
            ["They are in class", "Eles estão na aula"],
            ["We are friends", "Nós somos amigos"],
          ],
          explanation:
            "In English, 'to be' covers both 'ser' (permanent) and 'estar' (temporary). Context tells you which.",
          hint_pt_br:
            "'To be' = 'ser' ou 'estar'. O contexto define qual dos dois.",
        },
        {
          id: "tb-005",
          type: "fill_blank",
          question: 'Maria: "My brother Carlos ___ (be) at UCLA."',
          correct: "is",
          explanation: "One person (Carlos) = 'is'. Use 'is' for he / she / it.",
          hint_pt_br: "Carlos é uma pessoa (he), então usamos 'is'.",
        },
      ],
    },
  },
  {
    slug: "a1-1-grammar-subject-pronouns",
    cefr_level: "a1.1",
    category: "grammar",
    character_ids: ["maria", "carlos", "biscoito", "dona-helena"],
    content: {
      slug: "a1-1-grammar-subject-pronouns",
      title: "Subject Pronouns — I, you, he, she, it, we, they",
      description:
        "Meet the Silva family. Learn the seven subject pronouns and who they refer to.",
      category: "grammar",
      level: "A1",
      cefr_level: "a1.1",
      course_id: COURSE_ID,
      character_ids: ["maria", "carlos", "biscoito", "dona-helena"],
      xp_reward: 25,
      estimated_minutes: 10,
      summary_pt_br:
        "Pronomes pessoais sujeito: I (eu), you (você), he (ele), she (ela), it (ele/ela/isso para coisas), we (nós), they (eles/elas).",
      generator_model: "claude-opus-4-7",
      generated_at: new Date().toISOString(),
      exercises: [
        {
          id: "sp-001",
          type: "multiple_choice",
          question: 'Carlos is Maria\'s brother. ___ is 22 years old.',
          options: ["She", "He", "It", "They"],
          correct: 1,
          explanation: "Carlos is a boy / man → 'he'.",
          hint_pt_br: "Carlos é um homem → he.",
        },
        {
          id: "sp-002",
          type: "multiple_choice",
          question: "Biscoito is the family dog. ___ is very fluffy.",
          options: ["He", "She", "It", "They"],
          correct: 2,
          explanation:
            "In English, we commonly use 'it' for animals unless we want to emphasize a personal bond. 'He' or 'she' works too.",
          hint_pt_br:
            "Em inglês, para animais normalmente usamos 'it', mas 'he'/'she' também é aceito quando há afeto.",
        },
        {
          id: "sp-003",
          type: "fill_blank",
          question: "Maria and Carlos live in LA. ___ are from Brazil. (pronoun)",
          correct: "They",
          explanation: "Two or more people → 'they'.",
          hint_pt_br: "Duas ou mais pessoas → they.",
        },
        {
          id: "sp-004",
          type: "matching",
          pairs: [
            ["I", "Eu"],
            ["You", "Você / vocês"],
            ["He / She", "Ele / Ela"],
            ["We", "Nós"],
            ["They", "Eles / Elas"],
          ],
          explanation:
            "Note: English 'you' serves both singular and plural. There is no separate 'vocês'.",
          hint_pt_br: "'You' é singular E plural em inglês. Não existe 'vocês' separado.",
        },
        {
          id: "sp-005",
          type: "multiple_choice",
          question:
            "Dona Helena is in São Paulo. ___ calls the family every Sunday.",
          options: ["He", "She", "It", "We"],
          correct: 1,
          explanation: "Dona Helena is a woman → 'she'.",
          hint_pt_br: "Dona Helena é uma mulher → she.",
        },
      ],
    },
  },
  {
    slug: "a1-1-grammar-articles-a-an-the",
    cefr_level: "a1.1",
    category: "grammar",
    character_ids: ["maria", "mrs-johnson"],
    content: {
      slug: "a1-1-grammar-articles-a-an-the",
      title: "Articles — a, an, and the",
      description:
        "Mrs. Johnson explains when to use 'a', 'an', and 'the'. Common beginner mistakes demystified.",
      category: "grammar",
      level: "A1",
      cefr_level: "a1.1",
      course_id: COURSE_ID,
      character_ids: ["maria", "mrs-johnson"],
      xp_reward: 25,
      estimated_minutes: 12,
      summary_pt_br:
        "Artigos em inglês: 'a' (consoante), 'an' (vogal), 'the' (específico). Português não tem 'a/an' igual — atenção!",
      generator_model: "claude-opus-4-7",
      generated_at: new Date().toISOString(),
      exercises: [
        {
          id: "art-001",
          type: "multiple_choice",
          question: 'Maria bought ___ apple at the cafeteria.',
          options: ["a", "an", "the", "(nothing)"],
          correct: 1,
          explanation: "'Apple' starts with a vowel sound (a-pple) → 'an'.",
          hint_pt_br: "Palavras que começam com som de vogal → 'an'.",
        },
        {
          id: "art-002",
          type: "multiple_choice",
          question: "She is ___ student at Lincoln High.",
          options: ["a", "an", "the", "(nothing)"],
          correct: 0,
          explanation: "'Student' starts with a consonant sound → 'a'.",
          hint_pt_br: "Som de consoante → 'a'.",
        },
        {
          id: "art-003",
          type: "fill_blank",
          question: "Mrs. Johnson is ___ best teacher at school. (specific, known)",
          correct: "the",
          explanation:
            "'The' for something specific or already known. 'The best' = there's only one best.",
          hint_pt_br: "'The' para algo específico, único ou já conhecido.",
        },
        {
          id: "art-004",
          type: "matching",
          pairs: [
            ["a book", "um livro (qualquer)"],
            ["an umbrella", "um guarda-chuva (som de vogal)"],
            ["the book on the desk", "o livro (específico) sobre a mesa"],
            ["the sun", "o sol (único)"],
          ],
          explanation:
            "Use 'a'/'an' for one-of-many. Use 'the' when both speakers know which one.",
          hint_pt_br:
            "'a'/'an' = um de muitos. 'the' = o específico que ambos conhecem.",
        },
        {
          id: "art-005",
          type: "multiple_choice",
          question: "I play ___ guitar on weekends.",
          options: ["a", "an", "the", "(nothing)"],
          correct: 2,
          explanation:
            "Musical instruments take 'the': 'the guitar', 'the piano'. (Note: sports don't: 'play soccer'.)",
          hint_pt_br:
            "Instrumentos musicais levam 'the'. Esportes NÃO levam artigo: 'play soccer'.",
        },
      ],
    },
  },
];

let teacherId = null;
try {
  const res = await fetch(
    `${URL}/rest/v1/profiles?role=eq.teacher&select=id&limit=1`,
    {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
      },
    }
  );
  const rows = await res.json();
  if (Array.isArray(rows) && rows.length > 0) teacherId = rows[0].id;
} catch {}

let ok = 0;
for (const lesson of LESSONS) {
  const row = {
    slug: lesson.slug,
    course_id: COURSE_ID,
    cefr_level: lesson.cefr_level,
    category: lesson.category,
    title: lesson.content.title,
    content: lesson.content,
    character_ids: lesson.character_ids,
    generated_by: "claude-opus-4-7",
    published: false,
    created_by: teacherId,
    updated_at: new Date().toISOString(),
  };
  if (await upsert(row)) ok++;
}

console.log(`\n${ok}/${LESSONS.length} lessons seeded.`);
