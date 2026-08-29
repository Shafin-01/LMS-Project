"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth";
import RoleGuard from "@/components/RoleGuard";

function NewLessonForm({ courseId }: { courseId: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      // The lesson is intentionally created as a draft here, not auto-published —
      // publishing is handled separately on the Lesson Edit page (via the
      // publish/unpublish action), the same pattern used for course creation.
      // Keeping creation and publishing as separate steps keeps this form simple
      // and consistent with how courses are created.
      await authFetch("/lessons", {
        method: "POST",
        body: JSON.stringify({
          data: {
            Title: title,
            Content: content,
            VideoURL: videoUrl || null,
            course: courseId,
          },
        }),
      });

      router.push(`/dashboard/courses/${courseId}`);
    } catch (err: any) {
      setError(err.message || "Failed to create the lesson.");
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen text-slate-100 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href={`/dashboard/courses/${courseId}`} className="text-sm text-indigo-400 hover:underline">
          ← Back to Course
        </Link>

        <h1 className="text-2xl font-bold text-white">New Lesson</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Lesson Title</label>
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
              placeholder="Written lesson content (provide at least this if there's no video)"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg"
          >
            {saving ? "Saving..." : "Create Lesson"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function NewLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <RoleGuard allowedRoles={["Admin", "Content Manager", "Instructor"]}>
      {() => <NewLessonForm courseId={resolvedParams.id} />}
    </RoleGuard>
  );
}