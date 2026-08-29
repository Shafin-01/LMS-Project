"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUser, logout } from "@/lib/auth";

// After this many milliseconds without any user activity, an active
// session is automatically logged out. 30 minutes is a common default for
// this kind of platform — long enough not to interrupt someone actually
// reading a lesson, short enough to protect an account left signed in on
// a shared or public computer.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

// Activity on any of these events resets the idle timer. Passive listeners
// are used since none of them need to call preventDefault().
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

// Renders nothing — this component only exists to watch for user activity
// while mounted in the root layout, so it runs on every page.
export default function IdleLogout() {
  const router = useRouter();
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Nothing to guard for a logged-out visitor — no point watching for
    // inactivity when there's no active session to protect.
    if (!getUser()) return;

    const handleIdleTimeout = () => {
      logout();
      router.push("/login?reason=idle");
    };

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(handleIdleTimeout, IDLE_TIMEOUT_MS);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
    // Re-checked on every route change, so a fresh login (which always
    // navigates) starts watching a new session right away, and logging
    // out (a full page reload) naturally clears everything on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}