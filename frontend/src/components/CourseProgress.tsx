"use client";

import { useEffect, useState } from "react";
import { authFetch, getUser } from "@/lib/auth";
import LessonProgress from "@/components/LessonProgress";

interface CourseProgressProps {
  courseId: string;
  /** Already known enrollment id, e.g. when arriving from "My Courses". */
  enrollmentId?: string;
}

/**
 * Shows the same progress bar used on the lesson page, but on the course
 * page itself — so a Student can see how far along they are in a course
 * without having to open a lesson first.
 *
 * If an enrollmentId isn't already known (it's only passed in the URL when
 * coming from "My Courses"), this looks it up for the current Student.
 * Renders nothing for a guest, a non-Student account, or a Student who
 * hasn't enrolled in this course yet.
 */
export default function CourseProgress({ courseId, enrollmentId }: CourseProgressProps) {
  const [resolvedEnrollmentId, setResolvedEnrollmentId] = useState<string | null>(
    enrollmentId || null
  );
  const [checked, setChecked] = useState(!!enrollmentId);

  useEffect(() => {
    if (enrollmentId) {
      setResolvedEnrollmentId(enrollmentId);
      setChecked(true);
      return;
    }

    const user = getUser();
    if (!user || user.role?.name !== "Student") {
      setChecked(true);
      return;
    }

    let cancelled = false;

    authFetch(`/enrollments/my-enrollment/${courseId}`)
      .then((res) => {
        if (!cancelled) setResolvedEnrollmentId(res.data?.documentId || null);
      })
      .catch(() => {
        if (!cancelled) setResolvedEnrollmentId(null);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, enrollmentId]);

  if (!checked || !resolvedEnrollmentId) {
    return null;
  }

  return <LessonProgress enrollmentId={resolvedEnrollmentId} />;
}