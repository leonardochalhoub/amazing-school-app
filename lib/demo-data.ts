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
    totalXp: 340,
    streak: 12,
    lastActivity: "2026-04-16T09:15:00Z",
    assigned: [
      { kind: "lesson", slug: "greetings", title: "Greetings & Introductions", cefrLevel: "a1.1", category: "vocabulary", minutes: 8, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-01T10:00:00Z" },
      { kind: "lesson", slug: "present-simple", title: "Present Simple Tense", cefrLevel: "a1.1", category: "grammar", minutes: 10, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-03T10:00:00Z" },
      { kind: "music", slug: "perfect", title: "Ed Sheeran — Perfect", cefrLevel: "a1.1", category: "music", minutes: 10, status: "completed", scope: "per-student", assignedAt: "2026-04-05T10:00:00Z" },
      { kind: "music", slug: "as-long-as-you-love-me", title: "Backstreet Boys — As Long As You Love Me", cefrLevel: "a2.1", category: "music", minutes: 8, status: "completed", scope: "per-student", assignedAt: "2026-04-10T10:00:00Z" },
      { kind: "lesson", slug: "past-simple", title: "Past Simple Tense", cefrLevel: "a1.1", category: "grammar", minutes: 10, status: "assigned", scope: "classroom-wide", assignedAt: "2026-04-15T10:00:00Z" },
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
    totalXp: 210,
    streak: 5,
    lastActivity: "2026-04-15T16:30:00Z",
    assigned: [
      { kind: "lesson", slug: "greetings", title: "Greetings & Introductions", cefrLevel: "a1.1", category: "vocabulary", minutes: 8, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-01T10:00:00Z" },
      { kind: "lesson", slug: "present-simple", title: "Present Simple Tense", cefrLevel: "a1.1", category: "grammar", minutes: 10, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-03T10:00:00Z" },
      { kind: "music", slug: "believer", title: "Imagine Dragons — Believer", cefrLevel: "a1.2", category: "music", minutes: 8, status: "completed", scope: "per-student", assignedAt: "2026-04-08T10:00:00Z" },
      { kind: "lesson", slug: "past-simple", title: "Past Simple Tense", cefrLevel: "a1.1", category: "grammar", minutes: 10, status: "assigned", scope: "classroom-wide", assignedAt: "2026-04-15T10:00:00Z" },
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
    totalXp: 620,
    streak: 21,
    lastActivity: "2026-04-17T07:45:00Z",
    assigned: [
      { kind: "music", slug: "wonderwall", title: "Oasis — Wonderwall", cefrLevel: "b1.1", category: "music", minutes: 10, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-02T10:00:00Z" },
      { kind: "lesson", slug: "conditionals-first", title: "First Conditional", cefrLevel: "b1.1", category: "grammar", minutes: 15, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-06T10:00:00Z" },
      { kind: "lesson", slug: "conditionals-second", title: "Second Conditional", cefrLevel: "b1.2", category: "grammar", minutes: 18, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-10T10:00:00Z" },
      { kind: "music", slug: "tiny-dancer", title: "Elton John — Tiny Dancer", cefrLevel: "b1.1", category: "music", minutes: 14, status: "assigned", scope: "per-student", assignedAt: "2026-04-14T10:00:00Z" },
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
    totalXp: 95,
    streak: 3,
    lastActivity: "2026-04-14T19:00:00Z",
    assigned: [
      { kind: "lesson", slug: "greetings", title: "Greetings & Introductions", cefrLevel: "a1.1", category: "vocabulary", minutes: 8, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-01T10:00:00Z" },
      { kind: "music", slug: "here-comes-the-sun", title: "The Beatles — Here Comes the Sun", cefrLevel: "a1.1", category: "music", minutes: 8, status: "assigned", scope: "per-student", assignedAt: "2026-04-12T10:00:00Z" },
      { kind: "music", slug: "count-on-me", title: "Bruno Mars — Count on Me", cefrLevel: "a1.1", category: "music", minutes: 8, status: "assigned", scope: "per-student", assignedAt: "2026-04-14T10:00:00Z" },
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
    totalXp: 470,
    streak: 8,
    lastActivity: "2026-04-16T20:10:00Z",
    assigned: [
      { kind: "music", slug: "shake-it-off", title: "Taylor Swift — Shake It Off", cefrLevel: "a2.1", category: "music", minutes: 9, status: "completed", scope: "per-student", assignedAt: "2026-04-05T10:00:00Z" },
      { kind: "music", slug: "someone-like-you", title: "Adele — Someone Like You", cefrLevel: "a1.2", category: "music", minutes: 12, status: "completed", scope: "per-student", assignedAt: "2026-04-08T10:00:00Z" },
      { kind: "lesson", slug: "past-continuous", title: "Past Continuous", cefrLevel: "a2.1", category: "grammar", minutes: 12, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-11T10:00:00Z" },
      { kind: "lesson", slug: "present-perfect", title: "Present Perfect", cefrLevel: "a2.2", category: "grammar", minutes: 15, status: "assigned", scope: "classroom-wide", assignedAt: "2026-04-16T10:00:00Z" },
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
    totalXp: 40,
    streak: 1,
    lastActivity: "2026-04-13T12:00:00Z",
    assigned: [
      { kind: "lesson", slug: "greetings", title: "Greetings & Introductions", cefrLevel: "a1.1", category: "vocabulary", minutes: 8, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-13T10:00:00Z" },
      { kind: "music", slug: "let-it-be", title: "The Beatles — Let It Be", cefrLevel: "a1.2", category: "music", minutes: 10, status: "assigned", scope: "per-student", assignedAt: "2026-04-15T10:00:00Z" },
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
    totalXp: 530,
    streak: 14,
    lastActivity: "2026-04-17T08:20:00Z",
    assigned: [
      { kind: "music", slug: "thriller", title: "Michael Jackson — Thriller", cefrLevel: "a2.2", category: "music", minutes: 18, status: "completed", scope: "per-student", assignedAt: "2026-04-07T10:00:00Z" },
      { kind: "music", slug: "billie-jean", title: "Michael Jackson — Billie Jean", cefrLevel: "a2.1", category: "music", minutes: 15, status: "completed", scope: "per-student", assignedAt: "2026-04-09T10:00:00Z" },
      { kind: "lesson", slug: "conditionals-second", title: "Second Conditional", cefrLevel: "b1.2", category: "grammar", minutes: 18, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-12T10:00:00Z" },
      { kind: "music", slug: "landslide", title: "Fleetwood Mac — Landslide", cefrLevel: "a2.2", category: "music", minutes: 10, status: "assigned", scope: "per-student", assignedAt: "2026-04-16T10:00:00Z" },
    ],
  },
  {
    id: "s-rafael",
    fullName: "Rafael Nunes",
    preferredName: "Rafa",
    email: null,
    notes: "11 years old, Michael Jackson superfan. Easily motivated when songs are involved.",
    birthday: "2014-06-03",
    classroomId: "c-manha",
    classroomName: "Turma da Manhã",
    ageGroup: "kid",
    gender: "male",
    totalXp: 180,
    streak: 7,
    lastActivity: "2026-04-16T18:40:00Z",
    assigned: [
      { kind: "lesson", slug: "greetings", title: "Greetings & Introductions", cefrLevel: "a1.1", category: "vocabulary", minutes: 8, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-01T10:00:00Z" },
      { kind: "music", slug: "beat-it", title: "Michael Jackson — Beat It", cefrLevel: "a2.1", category: "music", minutes: 12, status: "completed", scope: "per-student", assignedAt: "2026-04-05T10:00:00Z" },
      { kind: "music", slug: "bad", title: "Michael Jackson — Bad", cefrLevel: "a2.1", category: "music", minutes: 10, status: "assigned", scope: "per-student", assignedAt: "2026-04-13T10:00:00Z" },
    ],
  },
  {
    id: "s-clara",
    fullName: "Clara Ferreira",
    preferredName: "Cla",
    email: "clara.f@example.com",
    notes: "Corporate student, needs English for meetings. Struggling with phrasal verbs.",
    birthday: "1992-02-28",
    classroomId: "c-club",
    classroomName: "Conversation Club",
    ageGroup: "adult",
    gender: "female",
    totalXp: 280,
    streak: 4,
    lastActivity: "2026-04-15T21:00:00Z",
    assigned: [
      { kind: "lesson", slug: "conditionals-first", title: "First Conditional", cefrLevel: "b1.1", category: "grammar", minutes: 15, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-02T10:00:00Z" },
      { kind: "music", slug: "wonderwall", title: "Oasis — Wonderwall", cefrLevel: "b1.1", category: "music", minutes: 10, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-06T10:00:00Z" },
      { kind: "music", slug: "thinking-out-loud", title: "Ed Sheeran — Thinking Out Loud", cefrLevel: "a2.1", category: "music", minutes: 14, status: "assigned", scope: "per-student", assignedAt: "2026-04-14T10:00:00Z" },
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
    totalXp: 160,
    streak: 2,
    lastActivity: "2026-04-14T22:30:00Z",
    assigned: [
      { kind: "lesson", slug: "present-simple", title: "Present Simple Tense", cefrLevel: "a1.1", category: "grammar", minutes: 10, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-03T10:00:00Z" },
      { kind: "lesson", slug: "present-continuous", title: "Present Continuous", cefrLevel: "a1.2", category: "grammar", minutes: 10, status: "completed", scope: "classroom-wide", assignedAt: "2026-04-05T10:00:00Z" },
      { kind: "music", slug: "i-want-it-that-way", title: "Backstreet Boys — I Want It That Way", cefrLevel: "a2.1", category: "music", minutes: 10, status: "assigned", scope: "per-student", assignedAt: "2026-04-12T10:00:00Z" },
    ],
  },
];

export function getDemoStudent(id: string): DemoStudent | null {
  return DEMO_STUDENTS.find((s) => s.id === id) ?? null;
}

export function getDemoClassroom(id: string): DemoClassroom | null {
  return DEMO_CLASSROOMS.find((c) => c.id === id) ?? null;
}
