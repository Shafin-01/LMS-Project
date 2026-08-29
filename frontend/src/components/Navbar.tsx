"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getUser, logout, StrapiUser } from "@/lib/auth";

function isProtectedPath(path: string): boolean {
  return (
    path.startsWith("/admin") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/my-courses") ||
    /^\/courses\/[^/]+\/lessons\//.test(path)
  );
}

const ROLE_TEXT_STYLES: Record<string, string> = {
  Admin: "text-rose-400",
  "Content Manager": "text-amber-400",
  Instructor: "text-sky-400",
  Student: "text-emerald-400",
};

// Standard theme colors for all active nav links
function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
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

// Mobile dropdown navigation link
function MobileNavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-500/10 text-indigo-300"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Navbar() {
  const [user, setUser] = useState<StrapiUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  // Close mobile dropdown when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    window.location.href = isProtectedPath(pathname) ? "/" : pathname;
  };

  const roleName = user?.role?.name;
  const canManageContent =
    roleName === "Admin" || roleName === "Content Manager" || roleName === "Instructor";
  const roleTextClass = roleName ? ROLE_TEXT_STYLES[roleName] || "text-slate-400" : "";

  return (
    <header className="relative rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm shadow-black/10 backdrop-blur mb-8">
      <div className="flex items-center justify-between gap-6 px-6 py-3.5">
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
            <NavLink href="/my-courses" label="My Courses" active={pathname.startsWith("/my-courses")} />
          )}

          {user && canManageContent && (
            <NavLink href="/dashboard" label="Dashboard" active={pathname.startsWith("/dashboard")} />
          )}

          {user && roleName === "Admin" && (
            <NavLink href="/admin" label="Admin Panel" active={pathname.startsWith("/admin")} />
          )}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 sm:flex">
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
              <div className="flex items-center gap-3">
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H9m9 0l-3-3m3 3l-3 3" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition-colors hover:border-slate-600 hover:text-white sm:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="border-t border-slate-800 px-4 pb-4 pt-2 sm:hidden">
          <nav className="flex flex-col gap-1">
            <MobileNavLink href="/courses" label="Courses" active={pathname.startsWith("/courses")} onClick={() => setMobileOpen(false)} />
            <MobileNavLink href="/blog" label="Blog" active={pathname.startsWith("/blog")} onClick={() => setMobileOpen(false)} />

            {user && roleName === "Student" && (
              <MobileNavLink href="/my-courses" label="My Courses" active={pathname.startsWith("/my-courses")} onClick={() => setMobileOpen(false)} />
            )}

            {user && canManageContent && (
              <MobileNavLink href="/dashboard" label="Dashboard" active={pathname.startsWith("/dashboard")} onClick={() => setMobileOpen(false)} />
            )}

            {user && roleName === "Admin" && (
              <MobileNavLink href="/admin" label="Admin Panel" active={pathname.startsWith("/admin")} onClick={() => setMobileOpen(false)} />
            )}
          </nav>

          <div className="mt-3 border-t border-slate-800 pt-3">
            {!user && (
              <div className="flex items-center gap-3">
                <Link
                  href={`/login?redirect=${encodeURIComponent(pathname)}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-lg border border-slate-700 px-3.5 py-2 text-center text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 rounded-lg bg-indigo-600 px-3.5 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {user && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H9m9 0l-3-3m3 3l-3 3" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}