import { fetchAPI } from "@/lib/api";
import Link from "next/link";
import EnrollButton from "@/components/EnrollButton";

interface Course {
  id: number;
  documentId: string;
  Title: string;
  Description: any;
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
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
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <Link href={`/courses/${course.documentId || course.id}`} className="block">
                    <span className="text-sm font-medium text-indigo-400 hover:underline">
                      View Course →
                    </span>
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