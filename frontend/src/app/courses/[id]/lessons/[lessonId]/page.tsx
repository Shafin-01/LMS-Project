"use client";

import React, { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch, getUser } from "@/lib/auth";
import Link from "next/link";
import LessonProgress from "@/components/LessonProgress";
import MarkCompleteButton from "@/components/MarkCompleteButton";

interface LessonData {
  id: number;
  documentId: string;
  Title: string;
  VideoURL?: string;
  Content?: string;
  quizzes?: { id: number; documentId: string }[];
}

export default function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const enrollmentIdFromQuery = searchParams.get("enrollmentId");

  const [enrollmentId, setEnrollmentId] = useState<string | null>(enrollmentIdFromQuery);
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);

  // enrollmentId URL-এ না থাকলে backend-এর secure endpoint দিয়ে খুঁজে নাও
  useEffect(() => {
    if (enrollmentId) return;

    const user = getUser();
    if (!user) return;

    // 🔧 আগে: filters দিয়ে generic /enrollments কল করা হতো
    // এখন: purpose-built endpoint, শুধু নিজের enrollment রিটার্ন করে
    authFetch(`/enrollments/my-enrollment/${resolvedParams.id}`)
      .then((res) => {
        if (res.data?.documentId) {
          setEnrollmentId(res.data.documentId);
        }
      })
      .catch((err) => {
        // enroll না করা থাকলেও এটা normal, তাই warn-level, error না
        console.warn("Enrollment lookup skipped:", err.message);
      });
  }, [resolvedParams.id, enrollmentId]);

  // 🔧 নতুন — enrollmentId URL-এ না থাকলে backend-এ জিজ্ঞেস করে খুঁজে নাও
  useEffect(() => {
    if (enrollmentId) return; // query তে already আছে, খোঁজার দরকার নেই

    const user = getUser();
    if (!user) return; // logged in না থাকলে কিছু করার নেই

    authFetch(
      `/enrollments?filters[student][id][$eq]=${user.id}&filters[course][documentId][$eq]=${resolvedParams.id}`
    )
      .then((res) => {
        const found = res.data?.[0];
        if (found?.documentId) {
          setEnrollmentId(found.documentId);
        }
      })
      .catch((err) => console.error("Enrollment lookup failed:", err));
  }, [resolvedParams.id, enrollmentId]);

  if (loading) return <p className="text-center text-slate-400 py-20">Loading...</p>;
  if (!lesson) return <p className="text-center text-slate-400 py-20">Lesson পাওয়া যায়নি।</p>;

  const hasQuiz = lesson.quizzes && lesson.quizzes.length > 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {enrollmentId && <LessonProgress enrollmentId={enrollmentId} />}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h1 className="text-2xl font-bold">{lesson.Title}</h1>

          {lesson.VideoURL && (
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <iframe
                src={lesson.VideoURL}
                className="w-full h-full"
                allowFullScreen
                title={lesson.Title}
              />
            </div>
          )}

          {lesson.Content && (
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{lesson.Content}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-4">
            {enrollmentId ? (
              <MarkCompleteButton
                enrollmentId={enrollmentId}
                lessonId={resolvedParams.lessonId}
                onDone={() => {}}
              />
            ) : (
              <p className="text-xs text-slate-500">
                Progress ট্র্যাক করতে চাইলে আগে এই course-এ enroll করো।
              </p>
            )}

            {hasQuiz && (
              <Link
                href={`/courses/${resolvedParams.id}/lessons/${resolvedParams.lessonId}/quiz${
                  enrollmentId ? `?enrollmentId=${enrollmentId}` : ""
                }`}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Take Quiz →
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}