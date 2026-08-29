"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch, getUser, StrapiUser } from "@/lib/auth";
import { fetchAPI } from "@/lib/api";

interface BlogAuthor {
  id: number;
  username: string;
}

interface BlogPost {
  id: number;
  documentId: string;
  Title: string;
  Body: any;
  CoverImageURL?: string | null;
  author?: BlogAuthor | null;
}

interface BlogPostsResponse {
  data: BlogPost[];
}

interface EnrollmentCourse {
  id: number;
  documentId: string;
  Title: string;
  lessons?: { id: number; documentId?: string }[];
}

interface EnrollmentEntry {
  id: number;
  documentId: string;
  course: EnrollmentCourse;
  completedLessons?: { id: number; documentId?: string }[];
}

interface EnrollmentsResponse {
  data: EnrollmentEntry[];
}

function blocksExcerpt(body: any, maxLength = 110): string {
  if (!body) return "";
  if (typeof body === "string") return body.slice(0, maxLength);
  if (Array.isArray(body)) {
    const text = body
      .map((item: any) => item.children?.map((c: any) => c.text).join(""))
      .join(" ");
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  }
  return "";
}

// Mirrors the percentage calculation the backend uses for enrollment
// progress (see enrollment.getProgress), so the numbers shown here always
// match what the course page and My Courses show for the same enrollment.
function computeProgress(enrollment: EnrollmentEntry): number {
  const totalLessons = enrollment.course?.lessons?.length || 0;
  if (totalLessons === 0) return 0;

  const lessonDocumentIds = new Set(
    (enrollment.course.lessons || []).map((lesson) => lesson.documentId).filter(Boolean)
  );

  const completedCount = (enrollment.completedLessons || []).filter(
    (lesson) => lesson.documentId && lessonDocumentIds.has(lesson.documentId)
  ).length;

  return Math.round((completedCount / totalLessons) * 100);
}

export default function Home() {
  const [user, setUser] = useState<StrapiUser | null>(null);
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentEntry[] | null>(null);

  // getUser() reads from localStorage, so login state is only known after
  // the component mounts on the client. The initial state (null) matches
  // what a server render would show — the logged-out layout — so there is
  // no hydration mismatch when this effect updates it a moment later.
  useEffect(() => {
    setUser(getUser());
  }, []);

  const loggedIn = !!user;
  const roleName = user?.role?.name;
  const isStudent = roleName === "Student";
  const isManagement =
    roleName === "Admin" || roleName === "Content Manager" || roleName === "Instructor";
  const isAdmin = roleName === "Admin";

  // A Student's enrollments, with per-course progress, so the home page
  // can show a personalized "Continue Learning" row instead of leaving
  // the page empty below the hero.
  useEffect(() => {
    if (!isStudent) return;

    let cancelled = false;

    authFetch(`/enrollments/my-enrollments`)
      .then((res: EnrollmentsResponse) => {
        if (!cancelled) setEnrollments(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setEnrollments([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isStudent]);

  // A logged-in user has already seen the onboarding pitch, so the home
  // page shows real content instead — the latest blog posts — rather than
  // repeating marketing copy. This only needs to load once we know the
  // user is logged in.
  useEffect(() => {
    if (!loggedIn) return;

    let cancelled = false;

    fetchAPI<BlogPostsResponse>(
      "/blog-posts?populate=*&sort=publishedAt:desc&pagination[limit]=3"
    )
      .then((res) => {
        if (!cancelled) setPosts(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  return (
    <main className="min-h-screen text-slate-100">
      {/* Hero */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            Learning Management System
          </span>

          {loggedIn ? (
            <>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
                Welcome back, {user!.username}.
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Pick up where you left off, or explore something new in the course catalog.
              </p>

              {/* Logged-in users get direct, role-relevant shortcuts instead
                  of the onboarding pitch shown to first-time visitors. */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  href="/courses"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                >
                  Browse Courses
                </Link>

                {isStudent && (
                  <Link
                    href="/my-courses"
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                  >
                    My Courses
                  </Link>
                )}

                {isManagement && (
                  <Link
                    href="/dashboard"
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                  >
                    Dashboard
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                  >
                    Admin Panel
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
                Learn new skills, one course at a time.
              </h1>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                LMS Portal brings courses, lessons, quizzes and progress tracking together
                in one place — built for learners who want structure, and instructors who
                want a simple way to teach.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  href="/courses"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                >
                  Browse Courses
                </Link>
                <Link
                  href="/register"
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                >
                  Create a Free Account
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Continue Learning — a Student's own enrolled courses with progress,
          so the most useful, personal thing they can do is front and center. */}
      {isStudent && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Continue Learning</h2>
              <Link href="/my-courses" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 shrink-0">
                View all courses →
              </Link>
            </div>

            {enrollments === null ? (
              <p className="text-slate-500 text-sm">Loading your courses…</p>
            ) : enrollments.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-4">
                <p className="text-slate-400">You haven't enrolled in any courses yet.</p>
                <Link
                  href="/courses"
                  className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
                >
                  Browse Courses
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.slice(0, 3).map((enrollment) => {
                  const percentage = computeProgress(enrollment);
                  return (
                    <Link
                      key={enrollment.id}
                      href={`/courses/${enrollment.course.documentId || enrollment.course.id}?enrollmentId=${enrollment.documentId}`}
                      className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 hover:border-slate-700 transition-colors"
                    >
                      <h3 className="text-white font-semibold">{enrollment.course.Title}</h3>
                      <div className="space-y-1.5">
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">{percentage}% complete</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Latest from the Blog — real, live content for a returning user,
          instead of leaving the page mostly empty below the hero. */}
      {loggedIn && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Latest from the Blog</h2>
              <Link href="/blog" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 shrink-0">
                View all articles →
              </Link>
            </div>

            {posts === null ? (
              <p className="text-slate-500 text-sm">Loading articles…</p>
            ) : posts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400 text-sm">
                No articles have been published yet. Check back soon.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.documentId || post.id}`}
                    className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors"
                  >
                    {post.CoverImageURL && (
                      <img
                        src={post.CoverImageURL}
                        alt={post.Title}
                        className="w-full h-36 object-cover"
                      />
                    )}
                    <div className="p-5 space-y-2">
                      <h3 className="text-white font-semibold">{post.Title}</h3>
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {blocksExcerpt(post.Body)}
                      </p>
                      {post.author?.username && (
                        <p className="text-xs text-slate-500 pt-1">— {post.author.username}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Feature highlights, "How it works" and the bottom CTA are onboarding
          content aimed at people who have never used the platform. A signed-in
          user already knows this, so these sections are only rendered for
          logged-out visitors — keeping the page focused for returning users. */}
      {!loggedIn && (
        <>
          <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900">
            <div className="max-w-6xl mx-auto space-y-10">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Everything you need to learn effectively
                </h2>
                <p className="text-slate-400">
                  A focused set of tools designed around how people actually learn online.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold">
                    1
                  </div>
                  <h3 className="text-white font-semibold">Structured Courses</h3>
                  <p className="text-sm text-slate-400">
                    Every course is broken down into clear, sequential lessons with video
                    or written content, so you always know what's next.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold">
                    2
                  </div>
                  <h3 className="text-white font-semibold">Progress Tracking</h3>
                  <p className="text-sm text-slate-400">
                    Mark lessons complete as you go and see your progress percentage for
                    every course, saved automatically.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold">
                    3
                  </div>
                  <h3 className="text-white font-semibold">Instant Quiz Feedback</h3>
                  <p className="text-sm text-slate-400">
                    Test what you've learned with short quizzes that are graded the moment
                    you submit — no waiting around for results.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold">
                    4
                  </div>
                  <h3 className="text-white font-semibold">Articles & Updates</h3>
                  <p className="text-sm text-slate-400">
                    Our blog covers tips, announcements and deeper dives written by the
                    team behind the courses.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900">
            <div className="max-w-5xl mx-auto space-y-10">
              <div className="text-center space-y-3">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">How it works</h2>
                <p className="text-slate-400">Four steps between you and your next skill.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center">
                    1
                  </div>
                  <h3 className="text-white font-semibold">Create an account</h3>
                  <p className="text-sm text-slate-400">Sign up in a few seconds, free of charge.</p>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center">
                    2
                  </div>
                  <h3 className="text-white font-semibold">Enroll in a course</h3>
                  <p className="text-sm text-slate-400">
                    Browse the catalog and enroll in whatever fits your goals.
                  </p>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center">
                    3
                  </div>
                  <h3 className="text-white font-semibold">Learn and track progress</h3>
                  <p className="text-sm text-slate-400">
                    Work through lessons at your own pace and watch your progress grow.
                  </p>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center">
                    4
                  </div>
                  <h3 className="text-white font-semibold">Test your knowledge</h3>
                  <p className="text-sm text-slate-400">
                    Take a short quiz at the end of a lesson and see exactly where you stand.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900">
            <div className="max-w-3xl mx-auto text-center bg-slate-900 border border-slate-800 rounded-2xl p-10 space-y-5">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Ready to start learning?
              </h2>
              <p className="text-slate-400">
                Explore the course catalog and find something worth learning today.
              </p>
              <Link
                href="/courses"
                className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Browse Courses
              </Link>
            </div>
          </section>
        </>
      )}
    </main>
  );
}