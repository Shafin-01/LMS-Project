import { fetchAPI } from "@/lib/api";
import Link from "next/link";

interface Lesson {
  id: number;
  documentId: string;
  Title: string;
  Content?: any;
  VideoURL?: string;
}

interface LessonResponse {
  data: Lesson;
}

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const resolvedParams = await params;
  const courseId = resolvedParams.id;
  const lessonId = resolvedParams.lessonId;

  let lesson: Lesson | null = null;

  try {
    // Strapi থেকে নির্দিষ্ট লেসনের ডেটা ফেচ করা
    const response = await fetchAPI<LessonResponse>(
      `/lessons/${lessonId}?populate=*`
    );
    lesson = response.data;
  } catch (error) {
    console.error("Failed to fetch lesson details:", error);
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-4">Lesson not found</h1>
        <Link href={`/courses/${courseId}`} className="text-indigo-400 hover:underline">
          ← Back to Course
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back to Course Link */}
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300"
        >
          ← Back to Course
        </Link>

        {/* Lesson Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
          <h1 className="text-3xl font-extrabold text-white">{lesson.Title}</h1>
        </div>

        {/* Video Player Placeholder or Embed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 aspect-video flex items-center justify-center">
          {lesson.VideoURL ? (
            <iframe
              src={lesson.VideoURL}
              title={lesson.Title}
              className="w-full h-full rounded-xl"
              allowFullScreen
            />
          ) : (
            <p className="text-slate-400 text-lg">No video available for this lesson yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}