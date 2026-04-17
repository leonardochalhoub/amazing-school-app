import { createAvatar } from "@dicebear/core";
import {
  adventurer,
  avataaars,
  bigEars,
  funEmoji,
  lorelei,
  micah,
  pixelArt,
  thumbs,
  toonHead,
} from "@dicebear/collection";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Age = "kid" | "teen" | "adult";
type Sex = "female" | "male";

// FIXED — each sample has the correct gender tagged
const SAMPLES: { label: string; age: Age; gender: Sex; seed: string }[] = [
  { label: "Kid girl", age: "kid", gender: "female", seed: "sample-maria" },
  { label: "Kid boy", age: "kid", gender: "male", seed: "sample-pedro" },
  { label: "Teen girl", age: "teen", gender: "female", seed: "sample-julia" },
  { label: "Teen boy", age: "teen", gender: "male", seed: "sample-tom" },
  { label: "Adult woman", age: "adult", gender: "female", seed: "sample-ana" },
  { label: "Adult man", age: "adult", gender: "male", seed: "sample-carlos" },
];

function scrub(svg: string): string {
  return svg
    .replace(/\swidth="[^"]*"/, "")
    .replace(/\sheight="[^"]*"/, "")
    .replace(
      /<svg /,
      '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" '
    );
}

const NATURAL_SKIN = ["edb98a", "d08b5b", "ae5d29", "ffdbb4"];
const NATURAL_HAIR = ["2c1b18", "4a312c", "724133", "a55728", "b58143"];
const BG = ["ffd5dc", "d1d4f9", "c0aede", "ffdfbf", "b6e3f4", "e0f2fe"];

// A — Adventurer locked to happy
function A(age: Age, g: Sex, seed: string) {
  return scrub(
    createAvatar(adventurer, {
      seed: `${age}-${g}-${seed}`,
      backgroundColor: BG,
      backgroundType: ["gradientLinear"],
      hair:
        g === "female"
          ? ["long07", "long09", "long13", "long16", "long19"]
          : ["short05", "short07", "short09", "short13", "short18"],
      hairProbability: 100,
      mouth: ["variant14", "variant15", "variant26"],
      eyes: ["variant02", "variant26"],
      eyebrows: ["variant01", "variant09"],
      earringsProbability: g === "female" ? 40 : 0,
      glassesProbability: age === "adult" ? 30 : 0,
      featuresProbability: 0,
      size: 200,
    }).toString()
  );
}

// B — Avataaars age-aware, no kid facial hair
function B(age: Age, g: Sex, seed: string) {
  return scrub(
    createAvatar(avataaars, {
      seed: `${age}-${g}-${seed}`,
      backgroundColor: BG,
      backgroundType: ["gradientLinear"],
      top:
        g === "female"
          ? ["longHairStraight", "longHairStraight2", "longHairCurly", "longHairBob", "longHairBun", "longHairCurvy"]
          : ["shortHairShortFlat", "shortHairShortRound", "shortHairShortWaved", "shortHairTheCaesar", "shortHairTheCaesarSidePart"],
      facialHair: age === "adult" && g === "male" ? ["beardLight", "beardMedium"] : [],
      facialHairProbability: age === "adult" && g === "male" ? 55 : 0,
      accessoriesProbability: age === "adult" ? 20 : 0,
      skinColor: NATURAL_SKIN,
      hairColor: NATURAL_HAIR,
      facialHairColor: NATURAL_HAIR,
      mouth: ["smile", "twinkle"],
      eyes: ["happy", "wink", "default"],
      eyebrows: ["default", "defaultNatural", "raisedExcited"],
      size: 200,
    }).toString()
  );
}

// C — Big Ears clean, cute
function C(age: Age, g: Sex, seed: string) {
  return scrub(
    createAvatar(bigEars, {
      seed: `${age}-${g}-${seed}`,
      backgroundColor: BG,
      backgroundType: ["gradientLinear"],
      hair:
        g === "female"
          ? ["long01", "long02", "long04", "long06", "long09", "long14", "long16"]
          : ["short01", "short04", "short08", "short10", "short14", "short17"],
      hairProbability: 100,
      accessoriesProbability: 0,
      glassesProbability: age === "adult" ? 25 : 0,
      size: 200,
    }).toString()
  );
}

// D — Lorelei minimalist
function D(age: Age, g: Sex, seed: string) {
  return scrub(
    createAvatar(lorelei, {
      seed: `${age}-${g}-${seed}`,
      backgroundColor: BG,
      backgroundType: ["gradientLinear"],
      hair:
        g === "female"
          ? ["variant01", "variant02", "variant13", "variant17", "variant23", "variant30", "variant38"]
          : ["variant04", "variant06", "variant10", "variant16", "variant32", "variant36", "variant42"],
      beardProbability: age === "adult" && g === "male" ? 40 : 0,
      glassesProbability: age === "adult" ? 30 : 0,
      earringsProbability: g === "female" ? 35 : 0,
      size: 200,
    }).toString()
  );
}

// E — Micah illustrator
function E(age: Age, g: Sex, seed: string) {
  return scrub(
    createAvatar(micah, {
      seed: `${age}-${g}-${seed}`,
      backgroundColor: BG,
      backgroundType: ["gradientLinear"],
      baseColor: ["f9c9b6", "ac6651", "77311d"],
      hair:
        g === "female"
          ? ["full", "pixie", "dannyPhantom"]
          : ["fonze", "doug", "mrT", "dannyPhantom"],
      facialHair: age === "adult" && g === "male" ? ["beard", "scruff"] : [],
      facialHairProbability: age === "adult" && g === "male" ? 50 : 0,
      earringsProbability: g === "female" ? 50 : 0,
      earrings: g === "female" ? ["hoop", "stud"] : undefined,
      glassesProbability: age === "adult" ? 25 : 0,
      size: 200,
    }).toString()
  );
}

// F — Fun Emoji (round faces)
function F(age: Age, g: Sex, seed: string) {
  return scrub(createAvatar(funEmoji, { seed: `${age}-${g}-${seed}`, backgroundColor: BG, size: 200 }).toString());
}

// G — Pixel Art (8-bit videogame)
function G(age: Age, g: Sex, seed: string) {
  return scrub(createAvatar(pixelArt, { seed: `${age}-${g}-${seed}`, backgroundColor: BG, size: 200 }).toString());
}

// H — Toon Head (big cartoon heads)
function H(age: Age, g: Sex, seed: string) {
  return scrub(createAvatar(toonHead, { seed: `${age}-${g}-${seed}`, backgroundColor: BG, size: 200 }).toString());
}

// I — Thumbs (simple icon-style)
function I(age: Age, g: Sex, seed: string) {
  return scrub(createAvatar(thumbs, { seed: `${age}-${g}-${seed}`, backgroundColor: BG, size: 200 }).toString());
}

// J — OS-native emoji (👧 👦 etc)
function J(age: Age, g: Sex) {
  const emoji =
    age === "kid"
      ? g === "female" ? "👧" : "👦"
      : age === "teen"
        ? g === "female" ? "👩‍🎓" : "👨‍🎓"
        : g === "female" ? "👩" : "👨";
  return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:56px;background:linear-gradient(135deg,#ffd5dc,#b6e3f4);">${emoji}</div>`;
}

// K — Initials on gradient
function K(label: string) {
  const initials = label.replace(/^(Kid|Teen|Adult)\s+/i, "").split(/\s+/).map((w) => w[0]).join("").toUpperCase();
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  const gradients = [
    "linear-gradient(135deg,#6366f1,#ec4899)",
    "linear-gradient(135deg,#10b981,#0ea5e9)",
    "linear-gradient(135deg,#f59e0b,#ef4444)",
  ];
  return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${gradients[hash % gradients.length]};color:white;font-weight:600;font-size:26px;">${initials}</div>`;
}

type Renderer = (age: Age, g: Sex, seed: string, label: string) => string;

const OPTIONS: { id: string; label: string; render: Renderer }[] = [
  { id: "A", label: "A — Adventurer (cute, big eyes)", render: (a, g, s) => A(a, g, s) },
  { id: "B", label: "B — Avataaars (classic cartoon)", render: (a, g, s) => B(a, g, s) },
  { id: "C", label: "C — Big Ears (round & cute)", render: (a, g, s) => C(a, g, s) },
  { id: "D", label: "D — Lorelei (hand-drawn minimal)", render: (a, g, s) => D(a, g, s) },
  { id: "E", label: "E — Micah (illustrator)", render: (a, g, s) => E(a, g, s) },
  { id: "F", label: "F — Fun Emoji (round faces, expressive)", render: (a, g, s) => F(a, g, s) },
  { id: "G", label: "G — Pixel Art (8-bit, retro)", render: (a, g, s) => G(a, g, s) },
  { id: "H", label: "H — Toon Head (big cartoon heads)", render: (a, g, s) => H(a, g, s) },
  { id: "I", label: "I — Thumbs (simple icon-style)", render: (a, g, s) => I(a, g, s) },
  { id: "J", label: "J — OS-native emoji (👧👦👩👨)", render: (a, g) => J(a, g) },
  { id: "K", label: "K — Initials on gradient (never ugly)", render: (_a, _g, _s, l) => K(l) },
];

export default async function AvatarStylesPreviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Pick a cartoon style
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          11 options below, including new ones: <strong>pixel art</strong>,{" "}
          <strong>toon heads</strong>, <strong>fun emoji</strong>, and{" "}
          <strong>OS-native emoji</strong>. Sample gender bug fixed — adult man
          now renders as male everywhere. Reply with{" "}
          <strong>&quot;use A&quot;</strong> (A–K) and I lock it in.
        </p>
      </div>

      <Link href="/teacher" className="text-xs text-muted-foreground hover:underline">
        ← Back to dashboard
      </Link>

      <div className="space-y-4">
        {OPTIONS.map((opt) => (
          <div key={opt.id} className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">{opt.label}</p>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                use {opt.id}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {SAMPLES.map((s) => (
                <div key={opt.id + s.label} className="text-center">
                  <div className="mx-auto h-20 w-20 overflow-hidden rounded-full ring-2 ring-background">
                    <div
                      className="h-full w-full"
                      dangerouslySetInnerHTML={{
                        __html: opt.render(s.age, s.gender, s.seed, s.label),
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">If none of these work:</p>
        <p className="mt-1">
          The honest answer is that none of the open-source auto-generated
          avatar libraries are going to produce custom-illustrated art. The
          clean paths are: <strong>(J) emoji</strong> — always age-appropriate
          since your OS draws them — or <strong>(K) initials</strong> — boring
          but never ugly. For genuinely beautiful unique portraits, the real
          fix is photo uploads per student, which is already wired up.
        </p>
      </div>
    </div>
  );
}
