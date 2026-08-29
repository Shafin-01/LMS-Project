"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth";
import { toBlocks, blocksToText } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";

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
      setError(err.message || "Blog post load করা যায়নি।");
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
      await loadData();
    } catch (err: any) {
      setError(err.message || "Save করা যায়নি।");
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
      await loadData();
    } catch (err: any) {
      setError(err.message || "Status বদলানো যায়নি।");
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("এই blog post টি স্থায়ীভাবে delete করতে চাও?")) return;
    setDeleting(true);
    setError("");
    try {
      await authFetch(`/blog-posts/${postId}`, { method: "DELETE" });
      router.push("/dashboard/blog");
    } catch (err: any) {
      setError(err.message || "Delete করা যায়নি।");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">লোড হচ্ছে...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-100 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6 pt-8">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/blog" className="text-sm text-indigo-400 hover:underline">
            ← Back to Blog Posts
          </Link>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isPublished ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
            }`}
          >
            {isPublished ? "Published" : "Draft"}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-white">Blog Post Edit করো</h1>

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
              Cover Image URL (optional)
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

        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4">
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="text-sm font-medium text-indigo-400 hover:underline disabled:opacity-50"
          >
            {toggling ? "..." : isPublished ? "Unpublish করো" : "Publish করো"}
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-medium text-red-400 hover:underline disabled:opacity-50"
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