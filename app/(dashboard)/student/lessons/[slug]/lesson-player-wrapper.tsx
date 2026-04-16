"use client";

import { useState } from "react";
import { LessonPlayer } from "@/components/lessons/lesson-player";
import { LevelUpModal } from "@/components/gamification/level-up-modal";
import type { Lesson } from "@/lib/content/loader";

interface LessonPlayerWrapperProps {
  lesson: Lesson;
}

export function LessonPlayerWrapper({ lesson }: LessonPlayerWrapperProps) {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);

  function handleComplete(result: {
    score: number;
    total: number;
    perfect: boolean;
  }) {
    // In a full implementation, this would call the submitAnswer action
    // and check if the student leveled up
    if (result.score === result.total) {
      setNewLevel((prev) => prev + 1);
      setShowLevelUp(true);
    }
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
