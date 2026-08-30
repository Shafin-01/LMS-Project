"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/components/Toast";

interface BlogPost {
  id: number;
  documentId: string;
  Title: string;
  isPublished: boolean;
}

/**
 * The full manageable blog-post list — fetch, publish/unpublish, edit link,
 * delete — pulled out into its own reusable component (rather than living
 * inline in the Dashboard page) so the fetch-and-mutate logic has a single
 * home and can be dropped into any section that needs to manage posts.
 */
export default function BlogPostManageList() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
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
      setPosts([]);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleToggle = async (documentId: string, currentlyPublished: boolean) => {
    setTogglingId(documentId);
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
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(documentId);
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

  if (posts === null) {
    return <p className="text-slate-400 text-sm">Loading blog posts...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
        No blog posts have been created yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => {
        const isToggling = togglingId === post.documentId;
        const isDeleting = deletingId === post.documentId;

        return (
          <div
            key={post.id}
            className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-white truncate">{post.Title}</span>
              <span
                className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                  post.isPublished
                    ? "bg-green-500/10 text-green-400"
                    : "bg-yellow-500/10 text-yellow-400"
                }`}
              >
                {post.isPublished ? "Published" : "Draft"}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Same pill-button styling as the course cards on the
                  Dashboard's "My Courses" column, so both sections read as
                  one consistent design language instead of two different
                  action styles (buttons here vs. underlined text links). */}
              <Link
                href={`/dashboard/blog/${post.documentId}`}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
              >
                Edit
              </Link>

              <button
                type="button"
                onClick={() => handleToggle(post.documentId, post.isPublished)}
                disabled={isToggling || isDeleting}
                className="text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                {isToggling ? "..." : post.isPublished ? "Unpublish" : "Publish"}
              </button>

              <button
                type="button"
                onClick={() => handleDelete(post.documentId, post.Title)}
                disabled={isToggling || isDeleting}
                className="text-xs font-medium bg-red-950/50 hover:bg-red-900/50 disabled:opacity-50 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}