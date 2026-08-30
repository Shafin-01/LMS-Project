"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth";
import { toBlocks, blocksToText } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import { useToast } from "@/components/Toast";
import BackButton from "@/components/BackButton";

interface LessonItem {
  id: number;
  documentId: string;
  Title: string;
  isPublished: boolean;
}

interface CourseData {
  id: number;
  documentId: string;
  Title: string;
  Description: any;
  isPublished: boolean;
}

function CourseManageContent({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<CourseData | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [togglingLessonId, setTogglingLessonId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const { showToast } = useToast();

  const loadData = async () => {
    setError("");
    try {
      // Fetching the course's draft version, since this always holds the most
      // up-to-date Title/Description regardless of publish state.
      const draftRes = await authFetch(`/courses/${courseId}?status=draft`);
      const courseDraft = draftRes.data;

      if (!courseDraft) {
        setError("Course not found.");
        setLoading(false);
        return;
      }

      let isPublished = false;
      try {
        const publishedCheck = await authFetch(
          `/courses?filters[documentId][$eq]=${courseId}&status=published`
        );
        isPublished = (publishedCheck.data || []).length > 0;
      } catch {
        isPublished = false;
      }

      setCourse({ ...courseDraft, isPublished });
      setTitle(courseDraft.Title || "");
      setDescription(blocksToText(courseDraft.Description));

      const draftLessonsRes = await authFetch(
        `/lessons?filters[course][documentId][$eq]=${courseId}&status=draft&sort=createdAt:asc`
      );
      const draftLessons: any[] = draftLessonsRes.data || [];

      let publishedLessonIds = new Set<string>();
      try {
        const publishedLessonsRes = await authFetch(
          `/lessons?filters[course][documentId][$eq]=${courseId}&status=published`
        );
        publishedLessonIds = new Set(
          (publishedLessonsRes.data || []).map((l: any) => l.documentId)
        );
      } catch {
        publishedLessonIds = new Set();
      }

      setLessons(
        draftLessons.map((l: any) => ({
          ...l,
          isPublished: publishedLessonIds.has(l.documentId),
        }))
      );
    } catch (err: any) {
      setError(err.message || "Failed to load the course.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await authFetch(`/courses/${courseId}`, {
        method: "PUT",
        body: JSON.stringify({
          data: { Title: title, Description: toBlocks(description) },
        }),
      });
      showToast("Course information updated.");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update the course.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!course) return;
    setPublishLoading(true);
    setError("");

    try {
      const action = course.isPublished ? "unpublish" : "publish";
      await authFetch(`/courses/${courseId}/actions/${action}`, {
        method: "POST",
      });
      showToast(action === "publish" ? "Course published." : "Course unpublished.");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to publish/unpublish the course.", "error");
    } finally {
      setPublishLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this course? All of its lessons and quizzes will be deleted too!"
      )
    )
      return;

    setDeletingCourse(true);
    try {
      await authFetch(`/courses/${courseId}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch (err: any) {
      showToast(err.message || "Failed to delete the course.", "error");
      setDeletingCourse(false);
    }
  };

  const handleToggleLessonPublish = async (lessonDocId: string, currentlyPublished: boolean) => {
    setTogglingLessonId(lessonDocId);
    setError("");
    try {
      const action = currentlyPublished ? "unpublish" : "publish";
      await authFetch(`/lessons/${lessonDocId}/actions/${action}`, {
        method: "POST",
      });
      showToast(action === "publish" ? "Lesson published." : "Lesson unpublished.");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to publish/unpublish the lesson.", "error");
    } finally {
      setTogglingLessonId(null);
    }
  };

  const handleDeleteLesson = async (lessonDocId: string) => {
    if (!window.confirm("Delete this lesson? Its quiz questions will be deleted too!"))
      return;

    setDeletingLessonId(lessonDocId);
    try {
      await authFetch(`/lessons/${lessonDocId}`, { method: "DELETE" });
      showToast("Lesson deleted.");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete the lesson.", "error");
    } finally {
      setDeletingLessonId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error || "Course not found."}</p>
        <BackButton href="/dashboard" label="Back to Dashboard" />
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-100 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <BackButton href="/dashboard" label="Back to Dashboard" />

        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Manage: {course.Title}</h1>
            <span
              className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                course.isPublished
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}
            >
              {course.isPublished ? "Published" : "Draft"}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTogglePublish}
              disabled={publishLoading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
            >
              {publishLoading
                ? "..."
                : course.isPublished
                ? "Unpublish"
                : "Publish"}
            </button>
            <button
              onClick={handleDeleteCourse}
              disabled={deletingCourse}
              className="bg-red-600/10 hover:bg-red-600/20 disabled:opacity-50 text-red-400 text-sm font-medium px-4 py-2 rounded-lg"
            >
              {deletingCourse ? "Deleting..." : "Delete Course"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-6"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Lessons</h2>
            <Link
              href={`/dashboard/courses/${courseId}/lessons/new`}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              + Add Lesson
            </Link>
          </div>

          {lessons.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400 text-sm">
              No lessons have been added yet.
            </div>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson, idx) => (
                <div
                  key={lesson.documentId}
                  className="flex flex-wrap justify-between items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {idx + 1}. {lesson.Title}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        lesson.isPublished
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {lesson.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleToggleLessonPublish(lesson.documentId, lesson.isPublished)
                      }
                      disabled={togglingLessonId === lesson.documentId}
                      className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-medium px-2.5 py-1 rounded-lg"
                    >
                      {togglingLessonId === lesson.documentId
                        ? "..."
                        : lesson.isPublished
                        ? "Unpublish"
                        : "Publish"}
                    </button>
                    <Link
                      href={`/dashboard/courses/${courseId}/lessons/${lesson.documentId}`}
                      className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
                    >
                      Edit / Quiz
                    </Link>
                    <button
                      onClick={() => handleDeleteLesson(lesson.documentId)}
                      disabled={deletingLessonId === lesson.documentId}
                      className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50 px-2"
                    >
                      {deletingLessonId === lesson.documentId ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CourseManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <RoleGuard allowedRoles={["Admin", "Content Manager", "Instructor"]}>
      {() => <CourseManageContent courseId={resolvedParams.id} />}
    </RoleGuard>
  );
}