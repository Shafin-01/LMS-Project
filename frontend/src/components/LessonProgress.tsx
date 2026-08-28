"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";

export default function LessonProgress({ enrollmentId }: { enrollmentId: number | string }) {
  const [progress, setProgress] = useState<{ percentage: number; completedCount: number; totalLessons: number } | null>(null);

  const fetchProgress = () => {
    authFetch(`/enrollments/${enrollmentId}/progress`)
      .then(setProgress)
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (enrollmentId) fetchProgress();
  }, [enrollmentId]);

  if (!progress) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
      <div className="flex justify-between text-sm text-slate-300">
        <span>Progress</span>
        <span>{progress.completedCount}/{progress.totalLessons} ({progress.percentage}%)</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
}