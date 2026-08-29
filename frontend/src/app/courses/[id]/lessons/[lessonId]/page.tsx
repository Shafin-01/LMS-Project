"use client";

import React, { use, useEffect, useState } from "react";
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

// Admin, Content Manager and Instructor accounts can review any lesson
// without enrolling — enrollment and progress tracking only apply to
// students, per the platform's role matrix.
const MANAGEMENT_ROLES = ["Admin", "Content Manager", "Instructor"];

export default function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // localStorage is only readable after mount, so we avoid rendering
  // anything role-dependent until then to prevent a hydration mismatch.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Require login, then read the current user's role once.
  useEffect(() => {
    const user = getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setRole(user.role?.name || null);
    setRoleChecked(true);
  }, [router]);

  const isManagement = role !== null && MANAGEMENT_ROLES.includes(role);

  // For a Student, look up their enrollment for this course first, so we
  // can show a clear "enroll to unlock" message instead of a raw error.
  // Admin / Content Manager / Instructor accounts skip this entirely.
  useEffect(() => {
    if (!roleChecked) return;

    if (isManagement) {
      setEnrollmentLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchEnrollment() {
      setEnrollmentLoading(true);

      try {
        const response = await authFetch(
          `/enrollments/my-enrollment/${resolvedParams.id}`
        );

        if (cancelled) return;

        const enrollment: EnrollmentData | null = response.data || null;

        if (!enrollment?.documentId) {
          setEnrollmentId(null);
          setError("You need to enroll in this course before you can view this lesson.");
          return;
        }

        // Extra safety check: make sure the returned enrollment actually
        // belongs to the course this lesson is under.
        const returnedCourseDocumentId = enrollment.course?.documentId;

        if (
          returnedCourseDocumentId &&
          returnedCourseDocumentId !== resolvedParams.id
        ) {
          setEnrollmentId(null);
          setError("No valid enrollment was found for this course.");
          return;
        }

        setEnrollmentId(enrollment.documentId);
      } catch (err: any) {
        if (!cancelled) {
          setEnrollmentId(null);
          setError(
            err?.message ||
              "You need to enroll in this course before you can view this lesson."
          );
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
  }, [resolvedParams.id, roleChecked, isManagement]);

  // Fetch the lesson content. The backend enforces the enrollment rule
  // independently (a non-enrolled Student gets a 403 here too), so this
  // is safe to call once we know the user's role. For a Student we wait
  // until the enrollment check above has finished, so a "not enrolled"
  // message can be shown instead of a generic load failure.
  useEffect(() => {
    if (!roleChecked) return;
    if (!isManagement && enrollmentLoading) return;
    if (!isManagement && !enrollmentId) return;

    let cancelled = false;

    async function fetchLesson() {
      setLoading(true);

      try {
        const response = await authFetch(
          `/lessons/${resolvedParams.lessonId}?populate=quizzes`
        );

        if (!cancelled) {
          setLesson(response.data || null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setLesson(null);
          setError(err?.message || "This lesson could not be loaded.");
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
  }, [
    resolvedParams.lessonId,
    roleChecked,
    isManagement,
    enrollmentLoading,
    enrollmentId,
  ]);

  if (!mounted || !roleChecked) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading lesson…</p>
      </main>
    );
  }

  if (!isManagement && enrollmentLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-300">Loading lesson…</p>
          <p className="text-sm text-slate-500">Checking your enrollment…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-5">
          <div className="bg-red-950/40 border border-red-900 rounded-xl p-6">
            <p className="text-red-400 font-medium">{error}</p>
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

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading lesson…</p>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-400">Lesson not found.</p>
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
        {/* Progress only applies to an enrolled Student. */}
        {enrollmentId && <LessonProgress enrollmentId={enrollmentId} />}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <Link
              href={`/courses/${resolvedParams.id}`}
              className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              ← Back to Course
            </Link>

            <h1 className="text-2xl font-bold text-white">{lesson.Title}</h1>
          </div>

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

          {lesson.Content && (
            <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {lesson.Content}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-800">
            {!isManagement && enrollmentId && (
              <MarkCompleteButton
                enrollmentId={enrollmentId}
                lessonId={lesson.documentId}
              />
            )}

            {hasQuiz && (isManagement || enrollmentId) && (
              <Link
                href={`/courses/${resolvedParams.id}/lessons/${resolvedParams.lessonId}/quiz`}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {isManagement ? "Preview Quiz →" : "Take Quiz →"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}