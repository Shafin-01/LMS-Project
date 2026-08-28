"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";

interface LessonProgressProps {
  enrollmentId: number | string;
}

interface ProgressResponse {
  percentage?: number;
  completedCount?: number;
  totalLessons?: number;
}

export default function LessonProgress({
  enrollmentId,
}: LessonProgressProps) {
  const [progress, setProgress] =
    useState<ProgressResponse | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  /*
   * Fetch latest progress from backend.
   */
  const fetchProgress = useCallback(async () => {
    if (!enrollmentId) return;

    try {
      setRefreshing(true);

      const data: ProgressResponse = await authFetch(
        `/enrollments/${enrollmentId}/progress`
      );

      setProgress({
        percentage: Number(data?.percentage ?? 0),
        completedCount: Number(data?.completedCount ?? 0),
        totalLessons: Number(data?.totalLessons ?? 0),
      });
    } catch (err) {
      console.error("Failed to fetch lesson progress:", err);
    } finally {
      setRefreshing(false);
    }
  }, [enrollmentId]);

  /*
   * Initial progress load.
   */
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  /*
   * Listen for lesson completion.
   *
   * When MarkCompleteButton successfully completes a lesson,
   * it dispatches "lesson-completed".
   *
   * This component catches that event and immediately
   * fetches the latest progress.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLessonCompleted = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<{
          enrollmentId?: string;
          lessonId?: string;
        }>;

      const eventEnrollmentId =
        customEvent.detail?.enrollmentId;

      /*
       * Only refresh if the event belongs to
       * this enrollment.
       */
      if (
        eventEnrollmentId &&
        String(eventEnrollmentId) !== String(enrollmentId)
      ) {
        return;
      }

      fetchProgress();
    };

    window.addEventListener(
      "lesson-completed",
      handleLessonCompleted
    );

    return () => {
      window.removeEventListener(
        "lesson-completed",
        handleLessonCompleted
      );
    };
  }, [enrollmentId, fetchProgress]);

  /*
   * Nothing to show while initial data is loading.
   */
  if (!progress) {
    return null;
  }

  const percentage = Math.min(
    100,
    Math.max(0, Number(progress.percentage ?? 0))
  );

  const completedCount = Number(
    progress.completedCount ?? 0
  );

  const totalLessons = Number(
    progress.totalLessons ?? 0
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
      <div className="flex justify-between text-sm text-slate-300">
        <span>Progress</span>

        <span>
          {completedCount}/{totalLessons} ({percentage}%)
        </span>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}