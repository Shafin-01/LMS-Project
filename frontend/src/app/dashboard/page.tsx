"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { authFetch, getUser } from "@/lib/auth";
import { blocksToText } from "@/lib/api";
import { useToast } from "@/components/Toast";

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

function CourseCard({
  course,
  isBusy,
  onTogglePublish,
  onDelete,
}: {
  course: Course;
  isBusy: boolean;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const descText = blocksToText(course.Description);

  return (
    <div className="flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-white">{course.Title}</h3>

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
          {descText || "No description available."}
        </p>

        <p className="text-xs text-slate-500">
          {course.lessons?.length || 0} lesson{course.lessons?.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800">
        <Link
          href={`/dashboard/courses/${course.documentId}`}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
        >
          Manage
        </Link>

        <button
          type="button"
          disabled={isBusy}
          onClick={onTogglePublish}
          className="ml-auto text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
        >
          {isBusy ? "..." : course.isPublished ? "Unpublish" : "Publish"}
        </button>

        <button
          type="button"
          disabled={isBusy}
          onClick={onDelete}
          className="text-xs font-medium bg-red-950/50 hover:bg-red-900/50 disabled:opacity-50 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function DashboardContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { showToast } = useToast();

  // The Blog management link is shown only to Admin/Content Manager —
  // Instructors don't have permission to access /dashboard/blog, so the
  // button is hidden for them too.
  const currentUser = getUser();
  const canManageBlog =
    currentUser?.role?.name === "Admin" || currentUser?.role?.name === "Content Manager";

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await authFetch("/courses/my-courses");
      setCourses(response.data || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load course list.");
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
      showToast(action === "publish" ? "Course published." : "Course unpublished.");
      await loadCourses();
    } catch (err: any) {
      showToast(err?.message || "Failed to publish/unpublish.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (course: Course) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${course.Title}"? All of its lessons and quizzes will also be deleted. This cannot be undone.`
    );

    if (!confirmed) return;

    setBusyId(course.documentId);

    try {
      await authFetch(`/courses/${course.documentId}`, {
        method: "DELETE",
      });
      showToast("Course deleted.");
      await loadCourses();
    } catch (err: any) {
      showToast(err?.message || "Failed to delete course.", "error");
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
              Manage your courses, lessons, and quizzes from here.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {canManageBlog && (
              <Link
                href="/dashboard/blog"
                className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                Manage Blog Posts
              </Link>
            )}

            <Link
              href="/dashboard/courses/new"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              + New Course
            </Link>
          </div>
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
              No courses have been created yet.
            </p>
            <Link
              href="/dashboard/courses/new"
              className="text-indigo-400 hover:underline"
            >
              Create your first course →
            </Link>
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          // A single flat list is enough: Admin/Content Manager can manage
          // every course regardless of who created it, and an Instructor's
          // "/courses/my-courses" call already returns only their own
          // courses (filtered server-side), so there's nothing to split here.
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.documentId}
                course={course}
                isBusy={busyId === course.documentId}
                onTogglePublish={() => handleTogglePublish(course)}
                onDelete={() => handleDelete(course)}
              />
            ))}
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