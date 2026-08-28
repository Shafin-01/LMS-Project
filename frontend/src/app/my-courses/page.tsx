"use client";

import { useEffect, useState } from "react";
import { authFetch, getUser } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Enrollment {
  id: number;
  course: { id: number; documentId: string; Title: string };
}

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    authFetch(`/enrollments?filters[student][id][$eq]=${user.id}&populate=course`)
      .then((res) => setEnrollments(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <p className="text-center text-slate-400 py-20">Loading...</p>;

  return (
    <main className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white">My Courses</h1>

        {enrollments.length === 0 ? (
          <p className="text-slate-400">তুমি এখনো কোনো course এ enroll করোনি।</p>
        ) : (
          <div className="grid gap-4">
            {enrollments.map((enr) => (
              <Link
                key={enr.id}
                href={`/courses/${enr.course.documentId || enr.course.id}?enrollmentId=${enr.id}`}
                className="block bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white">{enr.course.Title}</h3>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}