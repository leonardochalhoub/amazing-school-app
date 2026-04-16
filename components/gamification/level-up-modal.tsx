"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  badgeEarned?: { name: string; icon: string; description: string } | null;
}

export function LevelUpModal({
  isOpen,
  onClose,
  newLevel,
  badgeEarned,
}: LevelUpModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="text-center max-w-sm">
        <div className="py-6 space-y-4">
          <div className="relative">
            <div className="text-6xl animate-bounce">⭐</div>
            <div className="absolute inset-0 flex items-center justify-center">
              {[...Array(6)].map((_, i) => (
                <span
                  key={i}
                  className="absolute text-lg animate-ping"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    transform: `rotate(${i * 60}deg) translateY(-40px)`,
                  }}
                >
                  ✨
                </span>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
              Level {newLevel}!
            </h2>
            <p className="text-muted-foreground mt-1">
              Congratulations on reaching a new level!
            </p>
          </div>

          {badgeEarned && (
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="text-3xl">{badgeEarned.icon}</div>
              <p className="font-semibold mt-1">{badgeEarned.name}</p>
              <p className="text-xs text-muted-foreground">
                {badgeEarned.description}
              </p>
            </div>
          )}

          <Button onClick={onClose} className="w-full">
            Keep going!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
