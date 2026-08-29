"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser } from "@/lib/auth";

export default function HeroActions() {
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // getUser() reads from localStorage, so this can only run after the
  // component has mounted on the client.
  useEffect(() => {
    setMounted(true);
    setLoggedIn(!!getUser());
  }, []);

  // Reserve the same height before mount, so the layout doesn't shift
  // once the real buttons appear.
  if (!mounted) {
    return <div className="h-12" />;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
      <Link
        href="/courses"
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-lg transition-colors shadow-lg shadow-indigo-600/30"
      >
        Browse Courses
      </Link>

      {/* "Create a Free Account" only makes sense for a signed-out visitor. */}
      {!loggedIn && (
        <Link
          href="/register"
          className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-6 py-3 rounded-lg transition-colors border border-slate-700"
        >
          Create a Free Account
        </Link>
      )}
    </div>
  );
}