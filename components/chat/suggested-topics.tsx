"use client";

import { Card, CardContent } from "@/components/ui/card";

interface SuggestedTopicsProps {
  onSelect: (topic: string) => void;
}

const topics = [
  { text: "Tell me about your day", icon: "☀️" },
  { text: "Let's practice ordering food at a restaurant", icon: "🍕" },
  { text: "Describe your favorite hobby", icon: "🎨" },
  { text: "What did you do last weekend?", icon: "📅" },
  { text: "Let's role-play a job interview", icon: "💼" },
  { text: "Practice asking for directions", icon: "🗺️" },
];

export function SuggestedTopics({ onSelect }: SuggestedTopicsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center">
        Choose a topic to start practicing!
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {topics.map((topic) => (
          <Card
            key={topic.text}
            className="cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => onSelect(topic.text)}
          >
            <CardContent className="p-3 flex items-center gap-2">
              <span className="text-lg">{topic.icon}</span>
              <span className="text-sm">{topic.text}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
