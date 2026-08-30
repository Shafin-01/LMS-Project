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

  // While access is still being checked, every lesson would otherwise
  // render as "Locked" by default (a false flash for someone who actually
  // has access) before flipping to unlocked a moment later. Showing a
  // neutral placeholder here avoids that misleading swap.
  if (access === "checking") {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-sm text-slate-400">
        Checking your access…
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