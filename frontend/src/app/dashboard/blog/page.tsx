"use client";

import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import BackButton from "@/components/BackButton";
import BlogPostManageList from "@/components/BlogPostManageList";

// Matches the plus icon used on the main Dashboard's "New Course" / "New
// Post" buttons, so the action button here looks the same everywhere.
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function BlogListContent() {
  return (
    <main className="min-h-screen text-slate-100 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 pt-8">
        <BackButton href="/dashboard" label="Back to Dashboard" />

        {/* Center-aligned header matching the Dashboard / Admin Panel theme */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Blog Posts</h1>
          <p className="text-slate-400">Manage drafts and published articles for the blog.</p>
        </div>

        {/* Right-aligned rather than centered — it reads as the action for
            the post list below it, not as a lone floating button. */}
        <div className="flex justify-end">
          <Link
            href="/dashboard/blog/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            <PlusIcon />
            New Post
          </Link>
        </div>

        <BlogPostManageList />
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