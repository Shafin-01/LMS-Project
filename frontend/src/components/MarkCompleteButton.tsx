"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth";

export default function MarkCompleteButton({
  enrollmentId,
  lessonId,
  onDone,
}: {
  enrollmentId: number | string;
  lessonId: number | string;
  onDone?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await authFetch(`/enrollments/${enrollmentId}/complete-lesson`, {
        method: "POST",
        body: JSON.stringify({ lessonId }),
      });
      setDone(true);
      onDone?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || done}
      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      {done ? "✅ Completed" : loading ? "Saving..." : "Mark as Complete"}
    </button>
  );
}