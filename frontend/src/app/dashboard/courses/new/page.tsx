"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import { authFetch } from "@/lib/auth";
import { toBlocks } from "@/lib/api";

function NewCourseForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title দিতে হবে।");
      return;
    }

    setLoading(true);

    try {
      await authFetch("/courses", {
        method: "POST",
        body: JSON.stringify({
          data: {
            Title: title.trim(),
            Description: toBlocks(description),
          },
        }),
      });

      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Course তৈরি করা যায়নি।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="text-2xl font-bold text-white mt-3">
            New Course
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            নতুন course তৈরি হওয়ার পর draft অবস্থায় থাকবে — publish করার আগে
            student-রা এটা দেখতে পাবে না।
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
              placeholder="যেমন: Introduction to Data Structures"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 resize-y"
              placeholder="এই course-এ কী শেখানো হবে সংক্ষেপে লিখো..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? "তৈরি হচ্ছে..." : "Create Course"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function NewCoursePage() {
  return (
    <RoleGuard allowedRoles={["Admin", "Content Manager", "Instructor"]}>
      {() => <NewCourseForm />}
    </RoleGuard>
  );
}