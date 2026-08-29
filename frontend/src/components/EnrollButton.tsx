"use client";

import { useEffect, useState } from "react";
import { authFetch, getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function EnrollButton({ courseId }: { courseId: number | string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const [roleName, setRoleName] = useState<string | undefined>(undefined);
  const router = useRouter();

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

  const handleEnroll = async () => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await authFetch("/enrollments/enroll", {
        method: "POST",
        body: JSON.stringify({ courseId }),
      });
      setMessage("You are now enrolled in this course.");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Before mount, render an empty placeholder of the same height so the
  // page layout doesn't shift once the real (or absent) button appears.
  if (!mounted) {
    return <div className="w-full h-9" />;
  }

  if (!canEnroll) {
    return null;
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