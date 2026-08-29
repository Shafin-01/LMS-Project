import { fetchAPI } from "@/lib/api";
import Link from "next/link";

interface Lesson {
  id: number;
  documentId?: string;
  Title: string;
}

interface Course {
  id: number;
  documentId: string;
  Title: string;
  Description: any;
  lessons?: Lesson[];
}

interface CourseResponse {
  data: Course;
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enrollmentId?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const courseId = resolvedParams.id;
  const enrollmentId = resolvedSearchParams.enrollmentId;

  let course: Course | null = null;

  try {
    const response = await fetchAPI<CourseResponse>(`/courses/${courseId}?populate=*`);
    course = response.data;
  } catch (error) {
    console.error("Failed to fetch course details:", error);
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        <Link href="/courses" className="text-indigo-400 hover:underline">
          ← Back to Courses
        </Link>
      </div>
    );
  }

  let descText = "No description provided.";
  if (typeof course.Description === "string") {
    descText = course.Description;
  } else if (Array.isArray(course.Description)) {
    descText = course.Description
      .map((item: any) => item.children?.map((c: any) => c.text).join(""))
      .join(" ");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/courses" className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300">
          ← Back to Courses
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{course.Title}</h1>
          <p className="text-slate-300 text-base leading-relaxed">{descText}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Course Lessons</h2>
          {!course.lessons || course.lessons.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">
              No lessons available for this course yet.
            </div>
          ) : (
            <div className="space-y-3">
              {course.lessons.map((lesson, index) => {
                const lessonUrl = `/courses/${course.documentId || course.id}/lessons/${lesson.documentId || lesson.id}${
                  enrollmentId ? `?enrollmentId=${enrollmentId}` : ""
                }`;
                return (
                  <Link
                    key={lesson.id}
                    href={lessonUrl}
                    className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors block"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 font-bold text-sm">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-white">{lesson.Title}</span>
                    </div>
                    <span className="text-sm font-medium text-indigo-400">Watch Lesson →</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}