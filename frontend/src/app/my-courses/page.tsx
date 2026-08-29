"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth";
import RoleGuard from "@/components/RoleGuard";

interface EnrollmentCourse {
  id: number;
  documentId: string;
  Title: string;
  lessons?: { id: number; documentId?: string }[];
}

interface EnrollmentEntry {
  id: number;
  documentId: string;
  course: EnrollmentCourse;
  completedLessons?: { id: number; documentId?: string }[];
}

interface EnrollmentsResponse {
  data: EnrollmentEntry[];
}

// Mirrors the percentage calculation the backend uses for enrollment
// progress (see enrollment.getProgress), so the numbers shown here always
// match what the course page itself shows for the same enrollment.
function computeProgress(enrollment: EnrollmentEntry): number {
  const totalLessons = enrollment.course?.lessons?.length || 0;
  if (totalLessons === 0) return 0;

  const lessonDocumentIds = new Set(
    (enrollment.course.lessons || []).map((lesson) => lesson.documentId).filter(Boolean)
  );

  const completedCount = (enrollment.completedLessons || []).filter(
    (lesson) => lesson.documentId && lessonDocumentIds.has(lesson.documentId)
  ).length;

  return Math.round((completedCount / totalLessons) * 100);
}

function CourseProgressCard({ enrollment }: { enrollment: EnrollmentEntry }) {
  const percentage = computeProgress(enrollment);
  const completed = percentage === 100;

  return (
    <Link
      href={`/courses/${enrollment.course.documentId || enrollment.course.id}?enrollmentId=${enrollment.documentId}`}
      className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-white font-semibold">{enrollment.course.Title}</h3>
        {completed && (
          <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
            Completed
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${completed ? "bg-emerald-500" : "bg-indigo-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{percentage}% complete</p>
          <span className="text-xs font-medium text-indigo-400">
            {completed ? "Review Course →" : "Continue Learning →"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function MyCoursesContent() {
  const [enrollments, setEnrollments] = useState<EnrollmentEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch(`/enrollments/my-enrollments`)
      .then((res: EnrollmentsResponse) => setEnrollments(res.data || []))
      .catch((err: any) => {
        setError(err.message || "Failed to load your courses.");
        setEnrollments([]);
      });
  }, []);

  if (enrollments === null) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading your courses…</p>
      </main>
    );
  }

  const inProgress = enrollments.filter((e) => computeProgress(e) < 100);
  const completed = enrollments.filter((e) => computeProgress(e) === 100);

  return (
    <main className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <h1 className="text-3xl font-bold text-white">My Courses</h1>
          <p className="text-slate-400 mt-1">Track your enrolled courses and progress.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {enrollments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
            <p className="text-slate-400">You haven't enrolled in any courses yet.</p>
            <Link
              href="/courses"
              className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <>
            {inProgress.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">In Progress</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inProgress.map((enrollment) => (
                    <CourseProgressCard key={enrollment.id} enrollment={enrollment} />
                  ))}
                </div>
              </div>
            )}

            {completed.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Completed</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completed.map((enrollment) => (
                    <CourseProgressCard key={enrollment.id} enrollment={enrollment} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function MyCoursesPage() {
  return (
    <RoleGuard allowedRoles={["Student"]}>
      {() => <MyCoursesContent />}
    </RoleGuard>
  );
}