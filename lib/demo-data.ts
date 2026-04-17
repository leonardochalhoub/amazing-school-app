import type { AgeGroup, Gender } from "@/components/shared/cartoon-avatar";

export interface DemoStudent {
  id: string;
  fullName: string;
  preferredName: string | null;
  email: string | null;
  notes: string | null;
  birthday: string | null;
  classroomId: string;
  classroomName: string;
  ageGroup: AgeGroup;
  gender: Gender;
  totalXp: number;
  streak: number;
  lastActivity: string;
  assigned: DemoAssignedItem[];
}

export interface DemoAssignedItem {
  kind: "lesson" | "music";
  slug: string;
  title: string;
  cefrLevel: string;
  category: string;
  minutes: number;
  status: "assigned" | "skipped" | "completed";
  scope: "classroom-wide" | "per-student";
  assignedAt: string;
}

export interface DemoClassroom {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  studentCount: number;
}

export const DEMO_CLASSROOMS: DemoClassroom[] = [
  {
    id: "c-manha",
    name: "Turma da Manhã",
    description: "A1.1 — beginners · Mon/Wed 8am",
    inviteCode: "MANHA-2026",
    studentCount: 6,
  },
  {
    id: "c-club",
    name: "Conversation Club",
    description: "B1+ free practice · Thu 7pm",
    inviteCode: "CLUB-2026",
    studentCount: 4,
  },
];

// Helper to keep the demo readable. These are the canonical song
// titles — they must match the data in content/music/songs/*.json.
const SONG = {
  perfect: { title: "Ed Sheeran — Perfect", cefrLevel: "a1.1", minutes: 10 },
  "here-comes-the-sun": { title: "The Beatles — Here Comes the Sun", cefrLevel: "a1.1", minutes: 8 },
  "count-on-me": { title: "Bruno Mars — Count on Me", cefrLevel: "a1.1", minutes: 8 },
  "let-it-be": { title: "The Beatles — Let It Be", cefrLevel: "a1.2", minutes: 10 },
  imagine: { title: "John Lennon — Imagine", cefrLevel: "a1.2", minutes: 8 },
  yellow: { title: "Coldplay — Yellow", cefrLevel: "a1.2", minutes: 10 },
  believer: { title: "Imagine Dragons — Believer", cefrLevel: "a1.2", minutes: 8 },
  "someone-like-you": { title: "Adele — Someone Like You", cefrLevel: "a1.2", minutes: 12 },
  everybody: { title: "Backstreet Boys — Everybody", cefrLevel: "a1.2", minutes: 10 },
  "as-long-as-you-love-me": { title: "Backstreet Boys — As Long As You Love Me", cefrLevel: "a2.1", minutes: 8 },
  "i-want-it-that-way": { title: "Backstreet Boys — I Want It That Way", cefrLevel: "a2.1", minutes: 10 },
  "bye-bye-bye": { title: "NSYNC — Bye Bye Bye", cefrLevel: "a2.1", minutes: 8 },
  "its-gonna-be-me": { title: "NSYNC — It's Gonna Be Me", cefrLevel: "a2.1", minutes: 8 },
  "shake-it-off": { title: "Taylor Swift — Shake It Off", cefrLevel: "a2.1", minutes: 9 },
  "thinking-out-loud": { title: "Ed Sheeran — Thinking Out Loud", cefrLevel: "a2.1", minutes: 14 },
  "your-song": { title: "Elton John — Your Song", cefrLevel: "a2.1", minutes: 12 },
  "we-are-the-champions": { title: "Queen — We Are the Champions", cefrLevel: "a2.1", minutes: 8 },
  "have-you-ever-seen-the-rain": { title: "Creedence — Have You Ever Seen the Rain", cefrLevel: "a2.1", minutes: 8 },
  "beat-it": { title: "Michael Jackson — Beat It", cefrLevel: "a2.1", minutes: 12 },
  "billie-jean": { title: "Michael Jackson — Billie Jean", cefrLevel: "a2.1", minutes: 15 },
  bad: { title: "Michael Jackson — Bad", cefrLevel: "a2.1", minutes: 10 },
  thriller: { title: "Michael Jackson — Thriller", cefrLevel: "a2.2", minutes: 18 },
  landslide: { title: "Fleetwood Mac — Landslide", cefrLevel: "a2.2", minutes: 10 },
  "rocket-man": { title: "Elton John — Rocket Man", cefrLevel: "a2.2", minutes: 14 },
  wonderwall: { title: "Oasis — Wonderwall", cefrLevel: "b1.1", minutes: 10 },
  higher: { title: "Creed — Higher", cefrLevel: "b1.1", minutes: 15 },
  "with-arms-wide-open": { title: "Creed — With Arms Wide Open", cefrLevel: "b1.1", minutes: 12 },
  "tiny-dancer": { title: "Elton John — Tiny Dancer", cefrLevel: "b1.1", minutes: 14 },
} as const;

type MusicSlug = keyof typeof SONG;

function music(
  slug: MusicSlug,
  status: DemoAssignedItem["status"],
  scope: DemoAssignedItem["scope"],
  assignedAt: string
): DemoAssignedItem {
  const meta = SONG[slug];
  return {
    kind: "music",
    slug,
    title: meta.title,
    cefrLevel: meta.cefrLevel,
    category: "music",
    minutes: meta.minutes,
    status,
    scope,
    assignedAt,
  };
}

function lesson(
  slug: string,
  title: string,
  cefrLevel: string,
  minutes: number,
  category: string,
  status: DemoAssignedItem["status"],
  scope: DemoAssignedItem["scope"],
  assignedAt: string
): DemoAssignedItem {
  return {
    kind: "lesson",
    slug,
    title,
    cefrLevel,
    category,
    minutes,
    status,
    scope,
    assignedAt,
  };
}

export const DEMO_STUDENTS: DemoStudent[] = [
  {
    id: "s-maria",
    fullName: "Maria Silva",
    preferredName: "Mari",
    email: "maria.silva@example.com",
    notes: "Advanced vocab but shy in conversation. Loves 80s rock.",
    birthday: "1989-08-17",
    classroomId: "c-manha",
    classroomName: "Turma da Manhã",
    ageGroup: "adult",
    gender: "female",
    totalXp: 420,
    streak: 14,
    lastActivity: "2026-04-17T09:15:00Z",
    assigned: [
      lesson("greetings", "Greetings & Introductions", "a1.1", 8, "vocabulary", "completed", "classroom-wide", "2026-04-01T10:00:00Z"),
      lesson("present-simple", "Present Simple Tense", "a1.1", 10, "grammar", "completed", "classroom-wide", "2026-04-03T10:00:00Z"),
      music("perfect", "completed", "per-student", "2026-04-05T10:00:00Z"),
      music("as-long-as-you-love-me", "completed", "per-student", "2026-04-08T10:00:00Z"),
      music("thriller", "completed", "per-student", "2026-04-12T10:00:00Z"),
      music("bad", "assigned", "per-student", "2026-04-15T10:00:00Z"),
      lesson("past-simple", "Past Simple Tense", "a1.1", 10, "grammar", "assigned", "classroom-wide", "2026-04-16T10:00:00Z"),
    ],
  },
  {
    id: "s-joao",
    fullName: "João Pereira",
    preferredName: "Jota",
    email: "joao.p@example.com",
    notes: "15 years old, wants to understand song lyrics. Fan of Imagine Dragons.",
    birthday: "2011-03-22",
    classroomId: "c-manha",
    classroomName: "Turma da Manhã",
    ageGroup: "teen",
    gender: "male",
    totalXp: 280,
    streak: 6,
    lastActivity: "2026-04-16T16:30:00Z",
    assigned: [
      lesson("greetings", "Greetings & Introductions", "a1.1", 8, "vocabulary", "completed", "classroom-wide", "2026-04-01T10:00:00Z"),
      music("believer", "completed", "per-student", "2026-04-04T10:00:00Z"),
      music("yellow", "completed", "per-student", "2026-04-09T10:00:00Z"),
      lesson("present-simple", "Present Simple Tense", "a1.1", 10, "grammar", "completed", "classroom-wide", "2026-04-03T10:00:00Z"),
      music("we-are-the-champions", "assigned", "per-student", "2026-04-13T10:00:00Z"),
      lesson("past-simple", "Past Simple Tense", "a1.1", 10, "grammar", "assigned", "classroom-wide", "2026-04-16T10:00:00Z"),
    ],
  },
  {
    id: "s-ana",
    fullName: "Ana Costa",
    preferredName: null,
    email: "ana.c@example.com",
    notes: "Near-native speaker preparing for a conference talk.",
    birthday: "1994-11-05",
    classroomId: "c-club",
    classroomName: "Conversation Club",
    ageGroup: "adult",
    gender: "female",
    totalXp: 720,
    streak: 24,
    lastActivity: "2026-04-17T07:45:00Z",
    assigned: [
      music("wonderwall", "completed", "classroom-wide", "2026-04-02T10:00:00Z"),
      lesson("conditionals-first", "First Conditional", "b1.1", 15, "grammar", "completed", "classroom-wide", "2026-04-06T10:00:00Z"),
      music("with-arms-wide-open", "completed", "per-student", "2026-04-08T10:00:00Z"),
      lesson("conditionals-second", "Second Conditional", "b1.2", 18, "grammar", "completed", "classroom-wide", "2026-04-10T10:00:00Z"),
      music("tiny-dancer", "completed", "per-student", "2026-04-12T10:00:00Z"),
      music("higher", "assigned", "per-student", "2026-04-15T10:00:00Z"),
    ],
  },
  {
    id: "s-pedro",
    fullName: "Pedro Santos",
    preferredName: "Pedrinho",
    email: null,
    notes: "9 years old. Loves music and animals.",
    birthday: "2016-05-30",
    classroomId: "c-manha",
    classroomName: "Turma da Manhã",
    ageGroup: "kid",
    gender: "male",
    totalXp: 145,
    streak: 4,
    lastActivity: "2026-04-16T19:00:00Z",
    assigned: [
      lesson("greetings", "Greetings & Introductions", "a1.1", 8, "vocabulary", "completed", "classroom-wide", "2026-04-01T10:00:00Z"),
      music("here-comes-the-sun", "completed", "per-student", "2026-04-04T10:00:00Z"),
      music("count-on-me", "completed", "per-student", "2026-04-07T10:00:00Z"),
      music("everybody", "assigned", "per-student", "2026-04-14T10:00:00Z"),
      music("have-you-ever-seen-the-rain", "assigned", "per-student", "2026-04-16T10:00:00Z"),
    ],
  },
  {
    id: "s-bia",
    fullName: "Bia Oliveira",
    preferredName: "Bia",
    email: "bia.o@example.com",
    notes: "Teen learner, into Taylor Swift and pop.",
    birthday: "2009-09-12",
    classroomId: "c-club",
    classroomName: "Conversation Club",
    ageGroup: "teen",
    gender: "female",
    totalXp: 540,
    streak: 9,
    lastActivity: "2026-04-17T20:10:00Z",
    assigned: [
      music("shake-it-off", "completed", "per-student", "2026-04-05T10:00:00Z"),
      music("someone-like-you", "completed", "per-student", "2026-04-08T10:00:00Z"),
      lesson("past-continuous", "Past Continuous", "a2.1", 12, "grammar", "completed", "classroom-wide", "2026-04-11T10:00:00Z"),
      music("bye-bye-bye", "completed", "per-student", "2026-04-13T10:00:00Z"),
      music("its-gonna-be-me", "assigned", "per-student", "2026-04-15T10:00:00Z"),
      lesson("present-perfect", "Present Perfect", "a2.2", 15, "grammar", "assigned", "classroom-wide", "2026-04-16T10:00:00Z"),
    ],
  },
  {
    id: "s-lucas",
    fullName: "Lucas Almeida",
    preferredName: null,
    email: "lucas.a@example.com",
    notes: "Just enrolled. Starting from zero.",
    birthday: "1998-12-01",
    classroomId: "c-manha",
    classroomName: "Turma da Manhã",
    ageGroup: "adult",
    gender: "male",
    totalXp: 80,
    streak: 2,
    lastActivity: "2026-04-15T12:00:00Z",
    assigned: [
      lesson("greetings", "Greetings & Introductions", "a1.1", 8, "vocabulary", "completed", "classroom-wide", "2026-04-13T10:00:00Z"),
      music("let-it-be", "completed", "per-student", "2026-04-14T10:00:00Z"),
      music("imagine", "assigned", "per-student", "2026-04-15T10:00:00Z"),
      lesson("present-continuous", "Present Continuous", "a1.2", 10, "grammar", "assigned", "classroom-wide", "2026-04-16T10:00:00Z"),
    ],
  },
  {
    id: "s-sofia",
    fullName: "Sofia Rodrigues",
    preferredName: "Sofi",
    email: "sofia.r@example.com",
    notes: "Exchange student preparing for Cambridge FCE.",
    birthday: "2007-04-19",
    classroomId: "c-club",
    classroomName: "Conversation Club",
    ageGroup: "teen",
    gender: "female",
    totalXp: 610,
    streak: 16,
    lastActivity: "2026-04-17T08:20:00Z",
    assigned: [
      music("billie-jean", "completed", "per-student", "2026-04-05T10:00:00Z"),
      music("beat-it", "completed", "per-student", "2026-04-07T10:00:00Z"),
      lesson("conditionals-second", "Second Conditional", "b1.2", 18, "grammar", "completed", "classroom-wide", "2026-04-10T10:00:00Z"),
      music("landslide", "completed", "per-student", "2026-04-12T10:00:00Z"),
      music("rocket-man", "assigned", "per-student", "2026-04-14T10:00:00Z"),
      music("your-song", "assigned", "per-student", "2026-04-16T10:00:00Z"),
    ],
  },
  {
    id: "s-rafael",
    fullName: "Rafael Nunes",
    preferredName: "Rafa",
    email: null,
    notes: "11 years old, Michael Jackson superfan.",
    birthday: "2014-06-03",
    classroomId: "c-manha",
    classroomName: "Turma da Manhã",
    ageGroup: "kid",
    gender: "male",
    totalXp: 220,
    streak: 8,
    lastActivity: "2026-04-17T18:40:00Z",
    assigned: [
      lesson("greetings", "Greetings & Introductions", "a1.1", 8, "vocabulary", "completed", "classroom-wide", "2026-04-01T10:00:00Z"),
      music("bad", "completed", "per-student", "2026-04-05T10:00:00Z"),
      music("beat-it", "completed", "per-student", "2026-04-08T10:00:00Z"),
      music("billie-jean", "completed", "per-student", "2026-04-11T10:00:00Z"),
      music("thriller", "assigned", "per-student", "2026-04-14T10:00:00Z"),
    ],
  },
  {
    id: "s-clara",
    fullName: "Clara Ferreira",
    preferredName: "Cla",
    email: "clara.f@example.com",
    notes: "Corporate student, needs English for meetings.",
    birthday: "1992-02-28",
    classroomId: "c-club",
    classroomName: "Conversation Club",
    ageGroup: "adult",
    gender: "female",
    totalXp: 320,
    streak: 5,
    lastActivity: "2026-04-16T21:00:00Z",
    assigned: [
      lesson("conditionals-first", "First Conditional", "b1.1", 15, "grammar", "completed", "classroom-wide", "2026-04-02T10:00:00Z"),
      music("wonderwall", "completed", "classroom-wide", "2026-04-06T10:00:00Z"),
      music("thinking-out-loud", "completed", "per-student", "2026-04-09T10:00:00Z"),
      music("higher", "completed", "per-student", "2026-04-12T10:00:00Z"),
      music("with-arms-wide-open", "assigned", "per-student", "2026-04-15T10:00:00Z"),
    ],
  },
  {
    id: "s-gabriel",
    fullName: "Gabriel Martins",
    preferredName: null,
    email: "gabriel.m@example.com",
    notes: "Engineering student. Working on technical English and interview prep.",
    birthday: "2001-10-11",
    classroomId: "c-manha",
    classroomName: "Turma da Manhã",
    ageGroup: "adult",
    gender: "male",
    totalXp: 200,
    streak: 3,
    lastActivity: "2026-04-16T22:30:00Z",
    assigned: [
      lesson("present-simple", "Present Simple Tense", "a1.1", 10, "grammar", "completed", "classroom-wide", "2026-04-03T10:00:00Z"),
      lesson("present-continuous", "Present Continuous", "a1.2", 10, "grammar", "completed", "classroom-wide", "2026-04-05T10:00:00Z"),
      music("i-want-it-that-way", "completed", "per-student", "2026-04-10T10:00:00Z"),
      music("we-are-the-champions", "completed", "per-student", "2026-04-13T10:00:00Z"),
      music("count-on-me", "assigned", "per-student", "2026-04-15T10:00:00Z"),
    ],
  },
];

export function getDemoStudent(id: string): DemoStudent | null {
  return DEMO_STUDENTS.find((s) => s.id === id) ?? null;
}

export function getDemoClassroom(id: string): DemoClassroom | null {
  return DEMO_CLASSROOMS.find((c) => c.id === id) ?? null;
}
