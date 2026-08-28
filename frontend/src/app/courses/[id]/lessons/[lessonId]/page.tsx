"use client";

import React, {
  use,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch, getUser } from "@/lib/auth";
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

interface EnrollmentData {
  id: number;
  documentId: string;
  course?: {
    id: number;
    documentId: string;
  };
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

  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  const [enrollmentId, setEnrollmentId] =
    useState<string | null>(null);

  const [lesson, setLesson] =
    useState<LessonData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [enrollmentLoading, setEnrollmentLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // =========================================================
  // Prevent hydration mismatch
  // =========================================================
  useEffect(() => {
    setMounted(true);
  }, []);

  // =========================================================
  // 1. Check login
  // =========================================================
  useEffect(() => {
    const user = getUser();

    if (!user) {
      router.push("/login");
    }
  }, [router]);

  // =========================================================
  // 2. Fetch the CURRENT course's enrollment
  //
  //    We intentionally do NOT trust an enrollmentId from the URL.
  // =========================================================
  useEffect(() => {
    const user = getUser();

    if (!user) {
      setEnrollmentLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchEnrollment() {
      setEnrollmentLoading(true);

      try {
        const response =
          await authFetch(
            `/enrollments/my-enrollment/${resolvedParams.id}`
          );

        if (cancelled) {
          return;
        }

        const enrollment: EnrollmentData | null =
          response.data || null;

        if (!enrollment?.documentId) {
          setEnrollmentId(null);
          setError(
            "এই course-এ আগে enroll করতে হবে।"
          );
          return;
        }

        // Extra frontend safety check:
        // Make sure the returned enrollment actually belongs
        // to the current course.
        const returnedCourseDocumentId =
          enrollment.course?.documentId;

        if (
          returnedCourseDocumentId &&
          returnedCourseDocumentId !==
            resolvedParams.id
        ) {
          setEnrollmentId(null);
          setError(
            "এই course-এর valid enrollment পাওয়া যায়নি।"
          );
          return;
        }

        setEnrollmentId(
          enrollment.documentId
        );
      } catch (err: any) {
        if (!cancelled) {
          setEnrollmentId(null);

          if (err?.message) {
            setError(err.message);
          } else {
            setError(
              "এই course-এ আগে enroll করতে হবে।"
            );
          }
        }
      } finally {
        if (!cancelled) {
          setEnrollmentLoading(false);
        }
      }
    }

    fetchEnrollment();

    return () => {
      cancelled = true;
    };
  }, [resolvedParams.id]);

  // =========================================================
  // 3. Fetch lesson
  //
  //    Backend now also checks whether the Student is enrolled.
  // =========================================================
  useEffect(() => {
    const user = getUser();

    if (!user) {
      return;
    }

    let cancelled = false;

    async function fetchLesson() {
      setLoading(true);

      try {
        const response =
          await authFetch(
            `/lessons/${resolvedParams.lessonId}?populate=quizzes`
          );

        if (!cancelled) {
          setLesson(
            response.data || null
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          setLesson(null);

          setError(
            err?.message ||
              "Lesson load করা যায়নি।"
          );
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

  // =========================================================
  // Loading state
  // =========================================================
  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">
          Loading lesson...
        </p>
      </main>
    );
  }

  if (loading || enrollmentLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-300">
            Loading lesson...
          </p>

          <p className="text-sm text-slate-500">
            Enrollment verify করা হচ্ছে...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // Error / unauthorized state
  // =========================================================
  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-5">
          <div className="bg-red-950/40 border border-red-900 rounded-xl p-6">
            <p className="text-red-400 font-medium">
              {error}
            </p>
          </div>

          <Link
            href={`/courses/${resolvedParams.id}`}
            className="inline-flex items-center text-indigo-400 hover:text-indigo-300 hover:underline"
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
          <p className="text-slate-400">
            Lesson পাওয়া যায়নি।
          </p>

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

  const hasQuiz =
    Array.isArray(lesson.quizzes) &&
    lesson.quizzes.length > 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* =================================================
            Progress
        ================================================= */}
        {enrollmentId && (
          <LessonProgress
            enrollmentId={enrollmentId}
          />
        )}

        {/* =================================================
            Lesson card
        ================================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">

          <div className="space-y-2">

            <Link
              href={`/courses/${resolvedParams.id}`}
              className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              ← Back to Course
            </Link>

            <h1 className="text-2xl font-bold text-white">
              {lesson.Title}
            </h1>

          </div>

          {/* =================================================
              Video
          ================================================= */}
          {lesson.VideoURL && (
            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
              <iframe
                src={lesson.VideoURL}
                className="w-full h-full"
                allowFullScreen
                title={lesson.Title}
              />
            </div>
          )}

          {/* =================================================
              Content
          ================================================= */}
          {lesson.Content && (
            <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {lesson.Content}
            </div>
          )}

          {/* =================================================
              Actions
          ================================================= */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800">

            {enrollmentId ? (
              <MarkCompleteButton
                enrollmentId={enrollmentId}
                lessonId={lesson.documentId}
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