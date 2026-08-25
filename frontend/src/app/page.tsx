import { fetchAPI } from "@/lib/api";

interface Course {
  id: number;
  documentId: string;
  Title: string;
  Description: any; // Rich text handling-এর জন্য any দেওয়া হলো
}

interface CoursesResponse {
  data: Course[];
}

export default async function Home() {
  let courses: Course[] = [];

  try {
    const response = await fetchAPI<CoursesResponse>("/courses?populate=*");
    courses = response.data || [];
  } catch (error) {
    console.error("Failed to fetch courses:", error);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col items-center space-y-4 max-w-2xl mx-auto text-center">
          <span className="px-3 py-1 text-xs font-semibold tracking-wider text-indigo-600 uppercase bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400 rounded-full">
            Learning Management System
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Explore Our Courses
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Enhance your skills with our expert-led programming and tech courses.
          </p>
        </div>

        {/* Course Grid */}
        {courses.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              No courses found. Please add some courses from your Strapi admin panel!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {courses.map((course) => {
              // Strapi rich text বা string হ্যান্ডেল করার জন্য সেফ চেক
              let descText = "No description provided.";
              if (typeof course.Description === "string") {
                descText = course.Description;
              } else if (Array.isArray(course.Description)) {
                // যদি blocks অ্যারে হয়
                descText = course.Description.map((item: any) => 
                  item.children?.map((c: any) => c.text).join("")
                ).join(" ");
              } else if (typeof course.Description === "object" && course.Description !== null) {
                descText = JSON.stringify(course.Description);
              }

              return (
                <div
                  key={course.id}
                  className="flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {course.Title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3">
                      {descText}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      View Course →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}