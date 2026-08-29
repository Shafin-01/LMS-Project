"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getUser, logout, StrapiUser } from "@/lib/auth";

// Routes that only make sense while logged in. Logging out from one of these
// should land the user on the home page rather than leave them stranded on
// a page that immediately redirects them back to /login.
function isProtectedPath(path: string): boolean {
  return (
    path.startsWith("/admin") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/my-courses") ||
    /^\/courses\/[^/]+\/lessons\//.test(path)
  );
}

// Consistent color per role, used for the role label next to the signed-in
// user's name so their access level reads clearly at a glance.
const ROLE_TEXT_STYLES: Record<string, string> = {
  Admin: "text-rose-400",
  "Content Manager": "text-amber-400",
  Instructor: "text-sky-400",
  Student: "text-emerald-400",
};

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`relative px-0.5 py-2 text-sm font-medium transition-colors ${
        active ? "text-white" : "text-slate-400 hover:text-white"
      }`}
    >
      {label}
      {active && (
        <span className="absolute -bottom-[1px] left-0 right-0 h-0.5 rounded-full bg-indigo-500" />
      )}
    </Link>
  );
}

export default function Navbar() {
  const [user, setUser] = useState<StrapiUser | null>(null);
  const pathname = usePathname();

  // Re-read the current user on every route change, so the navbar updates
  // right after a login or logout without needing a full page reload.
  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  const handleLogout = () => {
    logout();
    // A full navigation (not router.push) forces every client component on
    // the destination page to re-derive its state as a logged-out visitor —
    // things like an "Enrolled" badge or an unlocked lesson wouldn't reset
    // on their own if we just pushed to the same route.
    window.location.href = isProtectedPath(pathname) ? "/" : pathname;
  };

  const roleName = user?.role?.name;
  const canManageContent =
    roleName === "Admin" || roleName === "Content Manager" || roleName === "Instructor";
  const roleTextClass = roleName ? ROLE_TEXT_STYLES[roleName] || "text-slate-400" : "";

  return (
    <header className="flex items-center justify-between gap-6 rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-3.5 shadow-sm shadow-black/10 backdrop-blur mb-8">
      <Link href="/" className="flex shrink-0 items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          L
        </span>
        <span className="text-base font-bold tracking-tight text-white">LMS Portal</span>
      </Link>

      <nav className="hidden items-center gap-7 sm:flex">
        <NavLink href="/courses" label="Courses" active={pathname.startsWith("/courses")} />
        <NavLink href="/blog" label="Blog" active={pathname.startsWith("/blog")} />

        {user && roleName === "Student" && (
          <NavLink
            href="/my-courses"
            label="My Courses"
            active={pathname.startsWith("/my-courses")}
          />
        )}

        {user && canManageContent && (
          <NavLink
            href="/dashboard"
            label="Dashboard"
            active={pathname.startsWith("/dashboard")}
          />
        )}

        {user && roleName === "Admin" && (
          <NavLink href="/admin" label="Admin Panel" active={pathname.startsWith("/admin")} />
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        {!user && (
          <>
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname)}`}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              Sign Up
            </Link>
          </>
        )}

        {user && (
          <div className="flex items-center gap-4 border-l border-slate-800 pl-4">
            <div className="hidden items-center gap-3 sm:flex">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/25">
                {user.username?.[0]?.toUpperCase() || "?"}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-white">{user.username}</p>
                <p className={`text-xs font-medium ${roleTextClass}`}>{roleName}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-red-900 hover:bg-red-950/40 hover:text-red-300"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H9m9 0l-3-3m3 3l-3 3"
                />
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}