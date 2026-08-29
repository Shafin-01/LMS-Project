"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { authFetch } from "@/lib/auth";
import { blocksToText } from "@/lib/api";

interface Lesson {
  id: number;
  documentId: string;
}

interface Instructor {
  id: number;
  username: string;
  email: string;
}

interface Course {
  id: number;
  documentId: string;
  Title: string;
  Description: any;
  instructor?: Instructor;
  lessons?: Lesson[];
  isPublished: boolean;
}

function DashboardContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authFetch("/courses/my-courses");
      setCourses(response.data || []);
    } catch (err: any) {
      setError(err?.message || "Course list load করা যায়নি।");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleTogglePublish = async (course: Course) => {
    setBusyId(course.documentId);

    try {
      const action = course.isPublished ? "unpublish" : "publish";
      await authFetch(`/courses/${course.documentId}/actions/${action}`, {
        method: "POST",
      });
      await loadCourses();
    } catch (err: any) {
      alert(err?.message || "Publish/Unpublish করা যায়নি।");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (course: Course) => {
    const confirmed = window.confirm(
      `"${course.Title}" course-টা delete করতে চাও? এর সাথের সব lesson আর quiz-ও মুছে যাবে। এটা ফেরানো যাবে না।`
    );

    if (!confirmed) return;

    setBusyId(course.documentId);

    try {
      await authFetch(`/courses/${course.documentId}`, {
        method: "DELETE",
      });
      await loadCourses();
    } catch (err: any) {
      alert(err?.message || "Course delete করা যায়নি।");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">
              তোমার course, lesson আর quiz এখান থেকে ম্যানেজ করো।
            </p>
          </div>

          <Link
            href="/dashboard/courses/new"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            + New Course
          </Link>
        </div>

        {loading && (
          <p className="text-slate-400">Loading courses...</p>
        )}

        {!loading && error && (
          <div className="bg-red-950/40 border border-red-900 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="text-center py-20 bg-slate-900 rounded-2xl border border-slate-800">
            <p className="text-slate-400 text-lg mb-4">
              এখনো কোনো course তৈরি করা হয়নি।
            </p>
            <Link
              href="/dashboard/courses/new"
              className="text-indigo-400 hover:underline"
            >
              প্রথম course টা বানাও →
            </Link>
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const isBusy = busyId === course.documentId;
              const descText = blocksToText(course.Description);

              return (
                <div
                  key={course.documentId}
                  className="flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-white">
                        {course.Title}
                      </h3>

                      <span
                        className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                          course.isPublished
                            ? "bg-emerald-900/50 text-emerald-400"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {course.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400 line-clamp-2">
                      {descText || "কোনো description নেই।"}
                    </p>

                    <div className="text-xs text-slate-500 space-y-1">
                      <p>{course.lessons?.length || 0} lesson(s)</p>
                      {course.instructor && (
                        <p>Instructor: {course.instructor.username}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800">
                    <Link
                      href={`/dashboard/courses/${course.documentId}`}
                      className="text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                      Manage →
                    </Link>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleTogglePublish(course)}
                      className="ml-auto text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {isBusy
                        ? "..."
                        : course.isPublished
                        ? "Unpublish"
                        : "Publish"}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDelete(course)}
                      className="text-xs font-medium bg-red-950/50 hover:bg-red-900/50 disabled:opacity-50 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RoleGuard allowedRoles={["Admin", "Content Manager", "Instructor"]}>
      {() => <DashboardContent />}
    </RoleGuard>
  );
}