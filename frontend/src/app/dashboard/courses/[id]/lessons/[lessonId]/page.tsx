"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth";
import RoleGuard from "@/components/RoleGuard";
import { useToast } from "@/components/Toast";
import BackButton from "@/components/BackButton";

interface LessonData {
  id: number;
  documentId: string;
  Title: string;
  Content: string;
  VideoURL: string | null;
  isPublished: boolean;
}

function LessonManageContent({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState(false);

  const router = useRouter();
  const { showToast } = useToast();

  const loadData = async () => {
    setError("");
    try {
      // lesson.ts's findOne() override ignores the status query param and always
      // returns the draft (most recently edited) version — which is exactly what
      // we want in this edit form.
      const lessonRes = await authFetch(`/lessons/${lessonId}`);
      const lessonData = lessonRes.data;

      if (!lessonData) {
        setError("Lesson not found.");
        setLoading(false);
        return;
      }

      let isPublished = false;
      try {
        const publishedCheck = await authFetch(
          `/lessons?filters[documentId][$eq]=${lessonId}&status=published`
        );
        isPublished = (publishedCheck.data || []).length > 0;
      } catch {
        isPublished = false;
      }

      setLesson({ ...lessonData, isPublished });
      setTitle(lessonData.Title || "");
      setContent(lessonData.Content || "");
      setVideoUrl(lessonData.VideoURL || "");
    } catch (err: any) {
      setError(err.message || "Failed to load the lesson.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await authFetch(`/lessons/${lessonId}`, {
        method: "PUT",
        body: JSON.stringify({
          data: { Title: title, Content: content, VideoURL: videoUrl || null },
        }),
      });
      showToast("Lesson updated.");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update the lesson.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!lesson) return;
    setPublishLoading(true);
    setError("");

    try {
      const action = lesson.isPublished ? "unpublish" : "publish";
      await authFetch(`/lessons/${lessonId}/actions/${action}`, {
        method: "POST",
      });
      showToast(action === "publish" ? "Lesson published." : "Lesson unpublished.");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to publish/unpublish the lesson.", "error");
    } finally {
      setPublishLoading(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this lesson? All of its quiz questions will be deleted too!"
      )
    )
      return;

    setDeletingLesson(true);
    try {
      await authFetch(`/lessons/${lessonId}`, { method: "DELETE" });
      router.push(`/dashboard/courses/${courseId}`);
    } catch (err: any) {
      showToast(err.message || "Failed to delete the lesson.", "error");
      setDeletingLesson(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error || "Lesson not found."}</p>
        <BackButton href={`/dashboard/courses/${courseId}`} label="Back to Course" />
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-100 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <BackButton href={`/dashboard/courses/${courseId}`} label="Back to Course" />

        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Manage Lesson: {lesson.Title}</h1>
            <span
              className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                lesson.isPublished
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}
            >
              {lesson.isPublished ? "Published" : "Draft"}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTogglePublish}
              disabled={publishLoading}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
            >
              {publishLoading ? "..." : lesson.isPublished ? "Unpublish" : "Publish"}
            </button>
            <button
              onClick={handleDeleteLesson}
              disabled={deletingLesson}
              className="bg-red-600/10 hover:bg-red-600/20 disabled:opacity-50 text-red-400 text-sm font-medium px-4 py-2 rounded-lg"
            >
              {deletingLesson ? "Deleting..." : "Delete Lesson"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Lesson info edit */}
        <form
          onSubmit={handleSaveLesson}
          className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-6"
        >
          <h2 className="text-lg font-bold text-white">Lesson Info</h2>
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
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Video URL (embed link, optional)
            </label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/embed/..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Text Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

            {/* Quiz questions now live on their own page, kept separate from
                this lesson-info form so editing text and managing MCQ
                questions don't compete for space on one long page. */}
            <Link
              href={`/dashboard/courses/${courseId}/lessons/${lessonId}/quiz`}
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              Manage Quiz →
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function LessonManagePage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <RoleGuard allowedRoles={["Admin", "Content Manager", "Instructor"]}>
      {() => (
        <LessonManageContent
          courseId={resolvedParams.id}
          lessonId={resolvedParams.lessonId}
        />
      )}
    </RoleGuard>
  );
}
