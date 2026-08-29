"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch, uploadImage } from "@/lib/auth";
import { toBlocks, blocksToText } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";
import { useToast } from "@/components/Toast";

function EditBlogPostForm({ postId }: { postId: string }) {
  const [title, setTitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [body, setBody] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input value so selecting the exact same file again still
    // fires a change event (browsers otherwise treat it as a no-op).
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImage(file);
      setCoverImageUrl(url);
      showToast("Image uploaded.");
    } catch (err: any) {
      showToast(err.message || "Image upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

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
      router.push("/dashboard/blog");
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
              Cover Image (optional)
            </label>

            {coverImageUrl && (
              <div className="relative mb-3 h-40 w-full overflow-hidden rounded-lg border border-slate-700">
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCoverImageUrl("")}
                  className="absolute top-2 right-2 rounded-full bg-slate-950/80 p-1.5 text-slate-300 transition-colors hover:text-white"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path
                      fillRule="evenodd"
                      d="M5.28 4.22a.75.75 0 00-1.06 1.06L8.94 10l-4.72 4.72a.75.75 0 101.06 1.06L10 11.06l4.72 4.72a.75.75 0 101.06-1.06L11.06 10l4.72-4.72a.75.75 0 00-1.06-1.06L10 8.94 5.28 4.22z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Image"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="text-xs text-slate-500">or paste a URL below</span>
            </div>

            <input
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
              className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
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
            {toggling ? "..." : isPublished ? "Unpublish" : "Publish"}
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