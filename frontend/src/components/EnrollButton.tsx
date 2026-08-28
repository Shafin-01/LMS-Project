"use client";

import { useState } from "react";
import { authFetch, getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function EnrollButton({ courseId }: { courseId: number | string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

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
      setMessage("Enroll সফল হয়েছে! ✅");
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "Enrolling..." : "Enroll করো"}
      </button>
      {message && <p className="text-xs text-slate-400 text-center">{message}</p>}
    </div>
  );
}