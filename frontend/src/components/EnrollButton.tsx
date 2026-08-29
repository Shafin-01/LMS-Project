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
  const [loggedIn, setLoggedIn] = useState(false);
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
    const user = getUser();
    setLoggedIn(!!user);
    setRoleName(user?.role?.name);
  }, []);

  // Enrolling is a Student-only action, but a logged-out visitor should
  // still see the "Enroll Now" button — clicking it sends them to log in
  // first. The button is only hidden for an already-logged-in account
  // that can never be a Student (Admin / Content Manager / Instructor).
  const isNonStudentAccount = loggedIn && roleName !== "Student";
  const canEnroll = !isNonStudentAccount;

  // Only a logged-in Student can already have an enrollment, so that's the
  // only case where we need to check. A guest visitor never has one yet.
  const isLoggedInStudent = loggedIn && roleName === "Student";

  useEffect(() => {
    if (!mounted) return;

    if (!isLoggedInStudent) {
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
  }, [mounted, isLoggedInStudent, courseId]);

  const handleEnroll = async () => {
    const user = getUser();
    if (!user) {
      // Send the user to log in, then straight back to this exact page
      // once they're signed in — after logging in they land right back
      // here and can press "Enroll Now" again.
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

  if (!mounted || (isLoggedInStudent && checkingEnrollment)) {
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