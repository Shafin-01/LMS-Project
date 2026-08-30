"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getUser, logout, StrapiUser } from "@/lib/auth";
import LearnixLogo from "@/components/LearnixLogo";

function isProtectedPath(path: string): boolean {
  return (
    path.startsWith("/admin") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/my-courses") ||
    /^\/courses\/[^/]+\/lessons\//.test(path)
  );
}

// A small colored pill for the role name, using the same "/10 background,
// /20 ring" idiom as the avatar circle elsewhere in the app — keeps every
// role indicator across the site visually consistent (point 10).
const ROLE_BADGE_STYLES: Record<string, string> = {
  Admin: "bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/20",
  "Content Manager": "bg-amber-500/10 text-amber-300 ring-1 ring-inset ring-amber-500/20",
  Instructor: "bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/20",
  Student: "bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/20",
};

function RoleBadge({ roleName }: { roleName: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
        ROLE_BADGE_STYLES[roleName] || "bg-slate-500/10 text-slate-300 ring-1 ring-inset ring-slate-500/20"
      }`}
    >
      {roleName}
    </span>
  );
}

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
  // getUser() reads from localStorage, so the real login state is only
  // known after this component mounts on the client. Until then we render
  // a neutral placeholder instead of "Log In / Sign Up" — otherwise every
  // refresh would flash the logged-out buttons for an instant before
  // switching to the signed-in avatar, which reads as if the session
  // briefly dropped.
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Whether the account dropdown (avatar + username, click to reveal
  // "Logout") is open. Using a click-to-open menu instead of an
  // always-visible Logout button is the standard pattern on most
  // professional web apps, and keeps the navbar less cluttered.
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setUser(getUser());
    setMounted(true);
  }, [pathname]);

  // Close mobile dropdown and the account menu when route changes
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Close the account dropdown on an outside click or Escape — standard
  // dropdown behavior so it doesn't stay open and block the page.
  useEffect(() => {
    if (!userMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUserMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [userMenuOpen]);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    setUserMenuOpen(false);
    window.location.href = isProtectedPath(pathname) ? "/" : pathname;
  };

  const roleName = user?.role?.name;
  const canManageContent =
    roleName === "Admin" || roleName === "Content Manager" || roleName === "Instructor";

  return (
    <header className="relative rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm shadow-black/10 backdrop-blur mb-8">
      <div className="relative flex items-center justify-between gap-6 px-6 py-3.5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <LearnixLogo className="h-8 w-8 shrink-0" />
          <span className="text-base font-bold tracking-tight text-white">Learnix</span>
        </Link>

        {/* Absolutely centered instead of a normal flex sibling: its
            position must never depend on the width of the logo or the
            auth controls on either side. With justify-between, any width
            change there (e.g. "Log In / Sign Up" swapping for the signed-in
            avatar, or a role-only link like "Admin Panel" appearing) would
            reflow the whole row and visibly shift these links sideways for
            an instant — this keeps them pinned to the true center always. */}
        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-7 sm:flex">
        <NavLink href="/" label="Home" active={pathname === "/"} />
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
          {!mounted ? (
            // Same-height placeholder while we check localStorage, so the
            // page doesn't flash "Log In / Sign Up" for a signed-in user.
            <div className="h-9 w-36" />
          ) : !user ? (
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
          ) : (
            // A click-to-open account menu (avatar + name, dropdown with
            // role and Logout) instead of a permanently-visible Logout
            // button — the standard pattern on professional web apps, and
            // it keeps the navbar itself less busy.
            <div ref={userMenuRef} className="relative border-l border-slate-800 pl-4">
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
                className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-slate-800/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/25">
                  {user.username?.[0]?.toUpperCase() || "?"}
                </span>
                <span className="hidden text-left leading-tight md:block">
                  <span className="block text-sm font-semibold text-white">{user.username}</span>
                </span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-lg shadow-black/30">
                  <div className="px-2.5 py-2">
                    <p className="truncate text-sm font-semibold text-white">{user.username}</p>
                    <div className="mt-1.5">
                      <RoleBadge roleName={roleName || ""} />
                    </div>
                  </div>
                  <div className="my-1 border-t border-slate-800" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-red-950/40 hover:text-red-300"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H9m9 0l-3-3m3 3l-3 3" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
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
            <MobileNavLink href="/" label="Home" active={pathname === "/"} onClick={() => setMobileOpen(false)} />
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
                    <div className="mt-1">
                      <RoleBadge roleName={roleName || ""} />
                    </div>
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