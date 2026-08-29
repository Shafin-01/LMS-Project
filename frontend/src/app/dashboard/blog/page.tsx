"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth";
import RoleGuard from "@/components/RoleGuard";
import { useToast } from "@/components/Toast";

interface BlogPost {
  id: number;
  documentId: string;
  Title: string;
  isPublished: boolean;
}

function BlogListContent() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const loadPosts = async () => {
    setError("");
    try {
      const [draftRes, publishedRes] = await Promise.all([
        authFetch("/blog-posts?status=draft&sort=createdAt:desc"),
        authFetch("/blog-posts?status=published"),
      ]);

      const draftPosts: any[] = draftRes.data || [];
      const publishedIds = new Set((publishedRes.data || []).map((p: any) => p.documentId));

      const merged: BlogPost[] = draftPosts.map((p: any) => ({
        id: p.id,
        documentId: p.documentId,
        Title: p.Title,
        isPublished: publishedIds.has(p.documentId),
      }));

      setPosts(merged);
    } catch (err: any) {
      setError(err.message || "Failed to load blog posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleToggle = async (documentId: string, currentlyPublished: boolean) => {
    setTogglingId(documentId);
    setError("");
    try {
      const action = currentlyPublished ? "unpublish" : "publish";
      await authFetch(`/blog-posts/${documentId}/actions/${action}`, {
        method: "POST",
      });
      showToast(action === "publish" ? "Blog post published." : "Blog post unpublished.");
      await loadPosts();
    } catch (err: any) {
      showToast(err.message || "Failed to change status.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (documentId: string, title: string) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete "${title}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(documentId);
    setError("");
    try {
      await authFetch(`/blog-posts/${documentId}`, { method: "DELETE" });
      showToast("Blog post deleted.");
      await loadPosts();
    } catch (err: any) {
      showToast(err.message || "Failed to delete.", "error");
    } finally {
      setDeletingId(null);
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
      <div className="max-w-4xl mx-auto space-y-6 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard" className="text-sm text-indigo-400 hover:underline">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white mt-2">Blog Posts</h1>
          </div>
          <Link
            href="/dashboard/blog/new"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-sm"
          >
            + New Post
          </Link>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            No blog posts have been created yet.
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const isToggling = togglingId === post.documentId;
              const isDeleting = deletingId === post.documentId;

              return (
                <div
                  key={post.id}
                  className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-white">{post.Title}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        post.isPublished
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {post.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleToggle(post.documentId, post.isPublished)}
                      disabled={isToggling || isDeleting}
                      className="text-sm font-medium text-indigo-400 hover:underline disabled:opacity-50"
                    >
                      {isToggling ? "..." : post.isPublished ? "Unpublish" : "Publish"}
                    </button>
                    <Link
                      href={`/dashboard/blog/${post.documentId}`}
                      className="text-sm font-medium text-indigo-400 hover:underline"
                    >
                      Edit →
                    </Link>
                    <button
                      onClick={() => handleDelete(post.documentId, post.Title)}
                      disabled={isToggling || isDeleting}
                      className="text-sm font-medium text-red-400 hover:underline disabled:opacity-50"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
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

export default function DashboardBlogPage() {
  return (
    <RoleGuard allowedRoles={["Admin", "Content Manager"]}>
      {() => <BlogListContent />}
    </RoleGuard>
  );
}