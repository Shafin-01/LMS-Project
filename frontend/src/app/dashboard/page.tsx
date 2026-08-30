"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { authFetch, getUser } from "@/lib/auth";
import { blocksToText } from "@/lib/api";
import { useToast } from "@/components/Toast";
import BlogPostManageList from "@/components/BlogPostManageList";

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

// Small plus icon used on both "New Course" / "New Post" buttons below,
// replacing the old plain "+" character with something that matches the
// stroke-icon style used across the rest of the app (e.g. BackButton).
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

// Small heading row shared by both dashboard columns — a section title on
// the left and its "create new" action on the right, so "My Courses" and
// "My Blogs" read as two parallel, equally-weighted sections.
function SectionHeader({
  title,
  newHref,
  newLabel,
}: {
  title: string;
  newHref: string;
  newLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <Link
        href={newHref}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        <PlusIcon />
        {newLabel}
      </Link>
    </div>
  );
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
    <div className="flex flex-col justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm hover:border-slate-700 transition-colors">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-xl font-bold text-white">{course.Title}</h3>

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

        <p className="text-sm text-slate-400 line-clamp-3">
          {descText || "No description available."}
        </p>

        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          {course.lessons?.length || 0} lesson{course.lessons?.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-4 mt-auto border-t border-slate-800">
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
    <main className="min-h-screen text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Center-aligned header matching Courses theme */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Dashboard
          </h1>
          <p className="text-slate-400">
            Manage your courses, lessons, quizzes and blogs from here.
          </p>
        </div>

        {/* Two sections side by side — "My Courses" and (for Admin /
            Content Manager only) "My Blogs" — each with its own heading,
            its own "create new" action, and its own full manageable list
            underneath, instead of one mixed row of buttons up top. */}
        <div className={`grid grid-cols-1 gap-10 ${canManageBlog ? "lg:grid-cols-2 lg:gap-8" : ""}`}>
          <div className="space-y-4">
            <SectionHeader title="My Courses" newHref="/dashboard/courses/new" newLabel="New Course" />

            {loading && <p className="text-slate-400 text-sm">Loading courses...</p>}

            {!loading && error && (
              <div className="bg-red-950/40 border border-red-900 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && courses.length === 0 && (
              <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800">
                <p className="text-slate-400 mb-3">No courses have been created yet.</p>
                <Link href="/dashboard/courses/new" className="text-indigo-400 hover:underline text-sm">
                  Create your first course →
                </Link>
              </div>
            )}

            {!loading && !error && courses.length > 0 && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
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

          {canManageBlog && (
            <div className="space-y-4">
              <SectionHeader title="My Blogs" newHref="/dashboard/blog/new" newLabel="New Post" />
              <BlogPostManageList />
            </div>
          )}
        </div>
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