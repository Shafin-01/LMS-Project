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

  // getUser() browser-এর localStorage পড়ে, তাই এটা শুধু client-side এ
  // (mount হওয়ার পর) কল করতে হবে — নাহলে server-render আর client-render
  // আলাদা হয়ে "hydration mismatch" error দেয়।
  useEffect(() => {
    setMounted(true);
    setRoleName(getUser()?.role?.name);
  }, []);

  const isManagementRole =
    roleName === "Admin" ||
    roleName === "Content Manager" ||
    roleName === "Instructor";

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

  // Client-side mount হওয়ার আগ পর্যন্ত কিছু render না করাই ভালো
  // (server আর client-এর প্রথম render মিলে যাওয়ার জন্য)।
  if (!mounted) {
    return (
      <div className="w-full h-9 bg-slate-800/50 rounded-lg animate-pulse" />
    );
  }

  if (isManagementRole) {
    return (
      <p className="text-xs text-slate-500 text-center py-2">
        এই role দিয়ে enroll করা যায় না।
      </p>
    );
  }

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