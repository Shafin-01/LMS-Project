"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth";
import { toBlocks, blocksToText } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import { useToast } from "@/components/Toast";
import BackButton from "@/components/BackButton";

function EditBlogPostForm({ postId }: { postId: string }) {
  const [title, setTitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [body, setBody] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { showToast } = useToast();

  const loadData = async () => {
    setError("");
    try {
      const postRes = await authFetch(`/blog-posts/${postId}?status=draft`);
      const post = postRes.data;

      setTitle(post.Title || "");
      setCoverImageUrl(post.CoverImageURL || "");
      setBody(blocksToText(post.Body));

      const publishedRes = await authFetch(
        `/blog-posts?filters[documentId][$eq]=${postId}&status=published`
      );
      setIsPublished((publishedRes.data || []).length > 0);
    } catch (err: any) {
      setError(err.message || "Failed to load blog post.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await authFetch(`/blog-posts/${postId}`, {
        method: "PUT",
        body: JSON.stringify({
          data: {
            Title: title,
            CoverImageURL: coverImageUrl || null,
            Body: toBlocks(body),
          },
        }),
      });
      showToast("Blog post updated.");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    setError("");
    try {
      const action = isPublished ? "unpublish" : "publish";
      await authFetch(`/blog-posts/${postId}/actions/${action}`, {
        method: "POST",
      });
      showToast(action === "publish" ? "Blog post published." : "Blog post unpublished.");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to change status.", "error");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this blog post?")) return;
    setDeleting(true);
    setError("");
    try {
      await authFetch(`/blog-posts/${postId}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch (err: any) {
      showToast(err.message || "Failed to delete.", "error");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-100 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6 pt-8">
        <div className="flex items-center justify-between">
          <BackButton href="/dashboard" label="Back to Dashboard" />
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isPublished ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
            }`}
          >
            {isPublished ? "Published" : "Draft"}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-white">Edit Blog Post</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-6">
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
              Image URL (embed link, optional)
            </label>
            <input
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              required
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

        {/* Same pill-button styling as the course edit page's top action bar
            (Publish/Unpublish + Delete Course), instead of underlined text
            links — keeps every "single item management" page in the app
            using one consistent action-button language. */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4">
          <button
            type="button"
            onClick={handleToggle}
            disabled={toggling}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
          >
            {toggling ? "..." : isPublished ? "Unpublish" : "Publish"}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600/10 hover:bg-red-600/20 disabled:opacity-50 text-red-400 text-sm font-medium px-4 py-2 rounded-lg"
          >
            {deleting ? "Deleting..." : "Delete Post"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <RoleGuard allowedRoles={["Admin", "Content Manager"]}>
      {() => <EditBlogPostForm postId={resolvedParams.id} />}
    </RoleGuard>
  );
}