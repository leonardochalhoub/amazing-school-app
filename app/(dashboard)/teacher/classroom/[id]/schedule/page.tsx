"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createScheduledClass } from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ScheduleClassPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createScheduledClass(classroomId, formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push(`/teacher/classroom/${classroomId}`);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Schedule Live Class</CardTitle>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Class Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Conversation Practice"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetingUrl">Meeting Link</Label>
              <Input
                id="meetingUrl"
                name="meetingUrl"
                type="url"
                placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Date & Time</Label>
              <Input
                id="scheduledAt"
                name="scheduledAt"
                type="datetime-local"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Scheduling..." : "Schedule Class"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
