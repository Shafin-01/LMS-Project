import { fetchAPI } from "@/lib/api";
import Link from "next/link";
import EnrollButton from "@/components/EnrollButton";

interface Course {
  id: number;
  documentId: string;
  Title: string;
  Description: any;
  enrollmentCount?: number;
}

interface CoursesResponse {
  data: Course[];
}

function descriptionToText(description: any): string {
  if (typeof description === "string") return description;
  if (Array.isArray(description)) {
    return description
      .map((item: any) => item.children?.map((c: any) => c.text).join(""))
      .join(" ");
  }
  return "No description provided.";
}

function formatEnrollmentCount(count: number): string {
  if (count === 0) return "No students enrolled yet";
  if (count === 1) return "1 student enrolled";
  return `${count.toLocaleString()} students enrolled`;
}

export default async function CoursesPage() {
  let courses: Course[] = [];

  try {
    const response = await fetchAPI<CoursesResponse>("/courses?populate=*");
    courses = response.data || [];
  } catch (error) {
    console.error("Failed to fetch courses:", error);
  }

  return (
    <main className="min-h-screen text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Browse Courses
          </h1>
          <p className="text-slate-400">
            Explore the full course catalog and enroll in what fits your goals.
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-20 bg-slate-900 rounded-2xl border border-slate-800">
            <p className="text-slate-400 text-lg">
              No courses are available yet. Please check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 lg:gap-8">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex flex-col justify-between rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm hover:border-slate-700 transition-colors"
              >
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white">{course.Title}</h3>
                  <p className="text-slate-400 text-sm line-clamp-3">
                    {descriptionToText(course.Description)}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="h-3.5 w-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                      />
                    </svg>
                    {formatEnrollmentCount(course.enrollmentCount || 0)}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-2.5">
                  <Link
                    href={`/courses/${course.documentId || course.id}`}
                    className="block w-full text-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
                  >
                    View Course
                  </Link>

                  <EnrollButton courseId={course.documentId || course.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}