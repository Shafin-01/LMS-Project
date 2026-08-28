"use client";

import React, { use } from "react";
import { useSearchParams } from "next/navigation";
import LessonProgress from "@/components/LessonProgress";
import MarkCompleteButton from "@/components/MarkCompleteButton";

export default function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const enrollmentId = searchParams.get("enrollmentId");

  return (
    <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {enrollmentId && <LessonProgress enrollmentId={enrollmentId} />}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h1 className="text-2xl font-bold">Lesson Content</h1>
          <p className="text-slate-400">Lesson ID: {resolvedParams.lessonId}</p>

          {enrollmentId && (
            <div className="pt-4">
              <MarkCompleteButton
                enrollmentId={enrollmentId}
                lessonId={resolvedParams.lessonId}
                onDone={() => {
                  console.log("Lesson completed successfully!");
                }}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}