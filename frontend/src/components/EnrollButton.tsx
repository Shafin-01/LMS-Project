"use client";

import { useEffect, useState } from "react";
import { authFetch, getUser } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";

interface EnrollButtonProps {
  courseId: number | string;
  onEnrolled?: () => void;
}

export default function EnrollButton({ courseId, onEnrolled }: EnrollButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [roleName, setRoleName] = useState<string | undefined>(undefined);
  const [enrolled, setEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // getUser() reads from localStorage, so it can only run after the
  // component has mounted on the client — otherwise the server-rendered
  // and client-rendered output would differ and cause a hydration error.
  useEffect(() => {
    setMounted(true);
    setRoleName(getUser()?.role?.name);
  }, []);

  // Only a Student can enroll in a course. Everyone else — a logged-out
  // visitor, or an Admin / Content Manager / Instructor account — simply
  // does not see an enroll control here at all.
  const canEnroll = roleName === "Student";

  // Once we know this is a Student, check whether they are already
  // enrolled in this specific course. Without this, a Student would keep
  // seeing "Enroll Now" for a course they've already joined.
  useEffect(() => {
    if (!mounted) return;

    if (!canEnroll) {
      setCheckingEnrollment(false);
      return;
    }

    let cancelled = false;

    authFetch(`/enrollments/my-enrollment/${courseId}`)
      .then((res) => {
        if (!cancelled) setEnrolled(!!res.data?.documentId);
      })
      .catch(() => {
        if (!cancelled) setEnrolled(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingEnrollment(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, canEnroll, courseId]);

  const handleEnroll = async () => {
    const user = getUser();
    if (!user) {
      // Send the user to login, then straight back to this page once
      // they're signed in, instead of dropping them on the home page.
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await authFetch("/enrollments/enroll", {
        method: "POST",
        body: JSON.stringify({ courseId }),
      });
      setEnrolled(true);
      onEnrolled?.();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Before mount, or while checking enrollment status, render an empty
  // placeholder of the same height so the page layout doesn't shift once
  // the real button (or "Enrolled" badge) appears.
  if (!mounted || (canEnroll && checkingEnrollment)) {
    return <div className="w-full h-9" />;
  }

  if (!canEnroll) {
    return null;
  }

  if (enrolled) {
    return (
      <div className="w-full text-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium py-2 rounded-lg">
        Enrolled
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "Enrolling..." : "Enroll Now"}
      </button>
      {message && <p className="text-xs text-slate-400 text-center">{message}</p>}
    </div>
  );
}