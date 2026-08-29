"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUser, logout, StrapiUser } from "@/lib/auth";

export default function Navbar() {
  const [user, setUser] = useState<StrapiUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Re-read the user on every route change, so the navbar updates right
  // after a login or logout.
  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  const handleLogout = () => {
    logout();
    setUser(null);
    router.push("/login");
  };

  const roleName = user?.role?.name;
  const canManageContent =
    roleName === "Admin" || roleName === "Content Manager" || roleName === "Instructor";

  return (
    <div className="flex justify-between items-center bg-slate-900 border border-slate-800 px-6 py-4 rounded-xl shadow-md mb-8">
      <Link href="/" className="flex items-center space-x-2">
        <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
        <span className="text-lg font-bold text-white tracking-wide">LMS Portal</span>
      </Link>

      <div className="flex items-center space-x-4 text-sm">
        <Link href="/courses" className="text-slate-300 hover:text-white transition-colors">
          Courses
        </Link>

        <Link href="/blog" className="text-slate-300 hover:text-white transition-colors">
          Blog
        </Link>

        {user && roleName === "Student" && (
          <Link href="/my-courses" className="text-slate-300 hover:text-white transition-colors">
            My Courses
          </Link>
        )}

        {user && canManageContent && (
          <Link href="/dashboard" className="text-slate-300 hover:text-white transition-colors">
            Dashboard
          </Link>
        )}

        {user && roleName === "Admin" && (
          <Link href="/admin" className="text-slate-300 hover:text-white transition-colors">
            Admin Panel
          </Link>
        )}

        {!user && (
          <>
            <Link
              href="/login"
              className="px-4 py-2 font-medium text-slate-300 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-sm"
            >
              Sign Up
            </Link>
          </>
        )}

        {user && (
          <div className="flex items-center space-x-3 pl-3 border-l border-slate-700">
            <span className="text-slate-400">
              {user.username} <span className="text-slate-600">({roleName})</span>
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-300 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}