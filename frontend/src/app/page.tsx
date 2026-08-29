import Link from "next/link";
import HeroActions from "@/components/HeroActions";

export default function Home() {
  return (
    <main className="min-h-screen text-slate-100">
      {/* Hero */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 rounded-full">
            Learning Management System
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
            Learn new skills, one course at a time.
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            LMS Portal brings courses, lessons, quizzes and progress tracking together
            in one place — built for learners who want structure, and instructors who
            want a simple way to teach.
          </p>
          <HeroActions />
        </div>
      </section>

      {/* Feature highlights */}
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

      {/* How it works */}
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

      {/* Bottom CTA */}
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
    </main>
  );
}