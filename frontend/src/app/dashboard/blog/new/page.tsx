"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth";
import { toBlocks } from "@/lib/api";
import RoleGuard from "@/components/RoleGuard";

function NewBlogPostForm() {
  const [title, setTitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      // Course/Lesson-এর মতোই — নতুন Blog Post ইচ্ছাকৃতভাবে draft হিসেবে তৈরি হচ্ছে,
      // auto-publish করা হচ্ছে না। পরে list page থেকে Publish করতে হবে।
      await authFetch("/blog-posts", {
        method: "POST",
        body: JSON.stringify({
          data: {
            Title: title,
            CoverImageURL: coverImageUrl || null,
            Body: toBlocks(body),
          },
        }),
      });

      router.push("/dashboard/blog");
    } catch (err: any) {
      setError(err.message || "Blog post তৈরি করা যায়নি।");
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen text-slate-100 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6 pt-8">
        <Link href="/dashboard/blog" className="text-sm text-indigo-400 hover:underline">
          ← Back to Blog Posts
        </Link>

        <h1 className="text-2xl font-bold text-white">নতুন Blog Post</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-6">
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
              placeholder="Blog post-এর লেখা এখানে দাও..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg"
          >
            {saving ? "Saving..." : "Blog Post তৈরি করো"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function NewBlogPostPage() {
  return (
    <RoleGuard allowedRoles={["Admin", "Content Manager"]}>
      {() => <NewBlogPostForm />}
    </RoleGuard>
  );
}