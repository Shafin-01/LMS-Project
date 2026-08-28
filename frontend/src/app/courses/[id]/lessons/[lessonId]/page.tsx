"use client";

import React, { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch, getUser } from "@/lib/auth";
import Link from "next/link";
import LessonProgress from "@/components/LessonProgress";
import MarkCompleteButton from "@/components/MarkCompleteButton";

interface LessonData {
  id: number;
  documentId: string;
  Title: string;
  VideoURL?: string;
  Content?: string;
  quizzes?: {
    id: number;
    documentId: string;
  }[];
}

export default function LessonPage({
  params,
}: {
  params: Promise<{
    id: string;
    lessonId: string;
  }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();

  const enrollmentIdFromQuery = searchParams.get("enrollmentId");

  const [mounted, setMounted] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(
    enrollmentIdFromQuery
  );
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch Lesson Data
  useEffect(() => {
    let cancelled = false;

    async function fetchLesson() {
      setLoading(true);
      setError("");

      try {
        const response = await authFetch(
          `/lessons/${resolvedParams.lessonId}?populate=quizzes`
        );

        if (!cancelled) {
          setLesson(response.data || null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Lesson load করা যায়নি।");
          setLesson(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLesson();

    return () => {
      cancelled = true;
    };
  }, [resolvedParams.lessonId]);

  // 2. Fetch Enrollment if not in Query Params
  useEffect(() => {
    if (enrollmentId) {
      return;
    }

    const user = getUser();
    if (!user) {
      return;
    }

    let cancelled = false;

    async function fetchEnrollment() {
      try {
        const response = await authFetch(
          `/enrollments/my-enrollment/${resolvedParams.id}`
        );

        if (!cancelled && response.data?.documentId) {
          setEnrollmentId(response.data.documentId);
        }
      } catch {
        // Not enrolled or fetch failed
      }
    }

    fetchEnrollment();

    return () => {
      cancelled = true;
    };
  }, [resolvedParams.id, enrollmentId]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading lesson...</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading lesson...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <Link
            href={`/courses/${resolvedParams.id}`}
            className="text-indigo-400 hover:underline"
          >
            ← Back to Course
          </Link>
        </div>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-400">Lesson পাওয়া যায়নি।</p>
          <Link
            href={`/courses/${resolvedParams.id}`}
            className="text-indigo-400 hover:underline"
          >
            ← Back to Course
          </Link>
        </div>
      </main>
    );
  }

  const hasQuiz = Array.isArray(lesson.quizzes) && lesson.quizzes.length > 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {enrollmentId && <LessonProgress enrollmentId={enrollmentId} />}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <Link
              href={`/courses/${resolvedParams.id}`}
              className="text-sm text-indigo-400 hover:underline"
            >
              ← Back to Course
            </Link>

            <h1 className="text-2xl font-bold">{lesson.Title}</h1>
          </div>

          {lesson.VideoURL && (
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <iframe
                src={lesson.VideoURL}
                className="w-full h-full"
                allowFullScreen
                title={lesson.Title}
              />
            </div>
          )}

          {lesson.Content && (
            <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {lesson.Content}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800">
            {enrollmentId ? (
              <MarkCompleteButton
                enrollmentId={enrollmentId}
                lessonId={resolvedParams.lessonId}
              />
            ) : (
              <p className="text-sm text-slate-500">
                এই lesson complete করতে হলে আগে course-এ enroll করতে হবে।
              </p>
            )}

            {hasQuiz && enrollmentId && (
              <Link
                href={`/courses/${resolvedParams.id}/lessons/${resolvedParams.lessonId}/quiz?enrollmentId=${enrollmentId}`}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Take Quiz →
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}