"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch, getUser } from "@/lib/auth";
import EnrollButton from "@/components/EnrollButton";

interface Lesson {
  id: number;
  documentId?: string;
  Title: string;
}

type AccessState = "checking" | "unlocked" | "locked-guest" | "locked-student";

const MANAGEMENT_ROLES = ["Admin", "Content Manager", "Instructor"];

export default function LessonList({
  lessons,
  courseId,
  enrollmentId,
}: {
  lessons: Lesson[];
  courseId: string;
  enrollmentId?: string;
}) {
  const [access, setAccess] = useState<AccessState>("checking");

  const checkAccess = async () => {
    const user = getUser();
    if (!user) {
      setAccess("locked-guest");
      return;
    }
    const roleName = user.role?.name;
    if (roleName && MANAGEMENT_ROLES.includes(roleName)) {
      setAccess("unlocked");
      return;
    }
    if (roleName !== "Student") {
      setAccess("locked-guest");
      return;
    }
    try {
      const res = await authFetch(`/enrollments/my-enrollment/${courseId}`);
      setAccess(res.data?.documentId ? "unlocked" : "locked-student");
    } catch {
      setAccess("locked-student");
    }
  };

  useEffect(() => {
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (!lessons || lessons.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">
        No lessons available for this course yet.
      </div>
    );
  }

  const unlocked = access === "unlocked";

  return (
    <div className="space-y-4">
      {access === "locked-guest" && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-indigo-300">
            Enroll in this course to view its lessons. You'll be asked to log in first.
          </p>
          <div className="w-48 shrink-0">
            <EnrollButton courseId={courseId} onEnrolled={checkAccess} />
          </div>
        </div>
      )}

      {access === "locked-student" && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 space-y-3">
          <p className="text-sm text-indigo-300">
            Enroll in this course to unlock its lessons.
          </p>
          <EnrollButton courseId={courseId} onEnrolled={checkAccess} />
        </div>
      )}

      <div className="space-y-3">
        {lessons.map((lesson, index) => {
          const lessonPath = `/courses/${courseId}/lessons/${lesson.documentId || lesson.id}${
            enrollmentId ? `?enrollmentId=${enrollmentId}` : ""
          }`;
          
          const content = (
            <>
              <div className="flex items-center space-x-4">
                <span className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${
                  unlocked ? "bg-indigo-950 text-indigo-400" : "bg-slate-800 text-slate-500"
                }`}>
                  {index + 1}
                </span>
                <span className={`font-semibold ${unlocked ? "text-white" : "text-slate-500"}`}>
                  {lesson.Title}
                </span>
              </div>
              
              {/* Button design update starts here */}
              {unlocked ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-300 bg-slate-800/50 border border-slate-700 rounded-md group-hover:bg-slate-800 transition-colors">
                  Watch Lesson
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-500 bg-slate-800/30 border border-slate-800/50 rounded-md">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Locked
                </span>
              )}
              {/* Button design update ends here */}
            </>
          );
          
          if (unlocked) {
            return (
              // Add 'group' class to Link so the inner span can react to hover
              <Link key={lesson.id} href={lessonPath}
                className="group flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors block">
                {content}
              </Link>
            );
          }
          return (
            <div key={lesson.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-5">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}