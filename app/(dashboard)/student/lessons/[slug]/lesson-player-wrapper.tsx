"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LessonPlayer } from "@/components/lessons/lesson-player";
import { LevelUpModal } from "@/components/gamification/level-up-modal";
import { markLessonComplete } from "@/lib/actions/lesson-completion";
import type { Lesson } from "@/lib/content/loader";

interface LessonPlayerWrapperProps {
  lesson: Lesson;
}

export function LessonPlayerWrapper({ lesson }: LessonPlayerWrapperProps) {
  const router = useRouter();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [, startTransition] = useTransition();

  function handleComplete(result: {
    score: number;
    total: number;
    perfect: boolean;
  }) {
    startTransition(async () => {
      const r = await markLessonComplete({
        lessonSlug: lesson.slug,
        xpReward: lesson.xp_reward,
      });
      if ("error" in r && r.error) {
        toast.error(r.error);
        return;
      }
      if ("success" in r) {
        if (r.alreadyCompleted) {
          toast.info("Lesson already completed — no extra XP this time.");
        } else {
          toast.success(`Lesson complete! +${r.awardedXp} XP`, { icon: "🎉" });
          if (result.score === result.total) {
            setNewLevel((prev) => prev + 1);
            setShowLevelUp(true);
          }
        }
        router.refresh();
      }
    });
  }

  return (
    <>
      <LessonPlayer lesson={lesson} onComplete={handleComplete} />
      <LevelUpModal
        isOpen={showLevelUp}
        onClose={() => setShowLevelUp(false)}
        newLevel={newLevel}
      />
    </>
  );
}
