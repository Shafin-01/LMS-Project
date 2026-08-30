import { fetchAPI } from "@/lib/api";
import BackButton from "@/components/BackButton";
import LessonList from "@/components/LessonList";
import CourseProgress from "@/components/CourseProgress";

export const dynamic = "force-dynamic";


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
  enrollmentCount?: number;
}

interface CourseResponse {
  data: Course;
}

function formatEnrollmentCount(count: number): string {
  if (count === 0) return "No students enrolled yet";
  if (count === 1) return "1 student enrolled";
  return `${count.toLocaleString()} students enrolled`;
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
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-6 p-6">
        <h1 className="text-2xl font-bold">Course not found</h1>
        <BackButton href="/courses" label="Back to Courses" />
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

  const lessonCount = course.lessons?.length || 0;
  const courseIdentifier = course.documentId || String(course.id);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <BackButton href="/courses" label="Back to Courses" />

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{course.Title}</h1>
          <p className="text-slate-300 text-base leading-relaxed">{descText}</p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-medium text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              {formatEnrollmentCount(course.enrollmentCount || 0)}
            </span>
          </div>

          <CourseProgress courseId={courseIdentifier} enrollmentId={enrollmentId} />
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Course Lessons</h2>
          <LessonList lessons={course.lessons || []} courseId={courseIdentifier} enrollmentId={enrollmentId} />
        </div>
      </div>
    </main>
  );
}