"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";

interface MarkCompleteButtonProps {
  enrollmentId: number | string;
  lessonId: number | string;
  onDone?: () => void;
}

interface ProgressResponse {
  percentage?: number;
  completedCount?: number;
  totalLessons?: number;

  completedLessons?: Array<{
    id?: number | string;
    documentId?: string;
  }>;
}

export default function MarkCompleteButton({
  enrollmentId,
  lessonId,
  onDone,
}: MarkCompleteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [done, setDone] = useState(false);

  /*
   * Check whether this lesson is already completed.
   */
  useEffect(() => {
    let cancelled = false;

    const checkCompletion = async () => {
      if (!enrollmentId || !lessonId) {
        setChecking(false);
        return;
      }

      try {
        setChecking(true);

        const data: ProgressResponse = await authFetch(
          `/enrollments/${enrollmentId}/progress`
        );

        if (cancelled) return;

        const completedCount = Number(data?.completedCount ?? 0);
        const totalLessons = Number(data?.totalLessons ?? 0);
        const percentage = Number(data?.percentage ?? 0);

        const completedLessons = Array.isArray(data?.completedLessons)
          ? data.completedLessons
          : [];

        const currentLessonId = String(lessonId);

        const currentLessonCompleted = completedLessons.some((lesson) => {
          const id = String(lesson?.id ?? "");
          const documentId = String(lesson?.documentId ?? "");

          return (
            id === currentLessonId ||
            documentId === currentLessonId
          );
        });

        /*
         * If every lesson is completed,
         * the current lesson is also considered completed.
         */
        const allLessonsCompleted =
          totalLessons > 0 && completedCount >= totalLessons;

        const fullyCompletedByPercentage =
          totalLessons > 0 && percentage >= 100;

        const isDone =
          currentLessonCompleted ||
          allLessonsCompleted ||
          fullyCompletedByPercentage;

        setDone(isDone);
      } catch (err) {
        console.error("Failed to check lesson completion:", err);
        setDone(false);
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    checkCompletion();

    return () => {
      cancelled = true;
    };
  }, [enrollmentId, lessonId]);

  const handleClick = async () => {
    if (loading || done) {
      return;
    }

    setLoading(true);

    try {
      /*
       * Mark the lesson as completed on the backend.
       */
      await authFetch(
        `/enrollments/${enrollmentId}/complete-lesson`,
        {
          method: "POST",
          body: JSON.stringify({
            lessonId,
          }),
        }
      );

      /*
       * Update this button immediately.
       */
      setDone(true);

      /*
       * Notify the parent component, if it provided a callback.
       */
      onDone?.();

      /*
       * Notify the LessonProgress component.
       *
       * LessonProgress listens for this event and refetches the
       * latest progress right away.
       */
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("lesson-completed", {
            detail: {
              enrollmentId: String(enrollmentId),
              lessonId: String(lessonId),
            },
          })
        );
      }
    } catch (err: any) {
      console.error("Failed to complete lesson:", err);

      alert(
        err?.message ||
          "This lesson could not be marked as complete. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Checking completion status.
   */
  if (checking) {
    return (
      <button
        type="button"
        disabled
        className="bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg opacity-70 cursor-not-allowed"
      >
        Checking...
      </button>
    );
  }

  /*
   * Completed state.
   */
  if (done) {
    return (
      <button
        type="button"
        disabled
        className="bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg cursor-default"
      >
        ✅ Completed
      </button>
    );
  }

  /*
   * Normal state.
   */
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      {loading ? "Saving..." : "Mark as Complete"}
    </button>
  );
}