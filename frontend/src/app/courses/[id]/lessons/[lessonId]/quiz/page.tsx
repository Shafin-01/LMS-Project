"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch, getUser } from "@/lib/auth";

interface QuizItem {
  id: number;
  documentId: string;
  Question: string;
  OptionA: string;
  OptionB: string;
  OptionC: string;
  OptionD: string;
  CorrectAnswer?: string;
}

interface LessonData {
  id: number;
  documentId: string;
  Title: string;
  quizzes?: QuizItem[];
}

interface ReviewItem {
  documentId: string;
  Question: string;
  OptionA: string;
  OptionB: string;
  OptionC: string;
  OptionD: string;
  CorrectAnswer: string;
  yourAnswer: string | null;
}

interface ReviewData {
  score: number;
  totalQuestions: number;
  submittedAt: string;
  review: ReviewItem[];
}

// Admin, Content Manager and Instructor accounts get a read-only preview
// of the quiz (correct answers included) instead of the student flow.
const MANAGEMENT_ROLES = ["Admin", "Content Manager", "Instructor"];

export default function QuizPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  const [enrollmentChecked, setEnrollmentChecked] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [checkingPrevious, setCheckingPrevious] = useState(true);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const user = getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setRole(user.role?.name || null);
    setRoleChecked(true);
  }, [router]);

  const isManagement = role !== null && MANAGEMENT_ROLES.includes(role);

  // Only a Student's enrollment needs to be verified before taking a quiz.
  useEffect(() => {
    if (!roleChecked) return;

    if (isManagement) {
      setEnrollmentChecked(true);
      return;
    }

    let cancelled = false;

    async function checkEnrollment() {
      try {
        const res = await authFetch(`/enrollments/my-enrollment/${resolvedParams.id}`);
        if (!cancelled) {
          setIsEnrolled(!!res.data?.documentId);
        }
      } catch {
        if (!cancelled) {
          setIsEnrolled(false);
        }
      } finally {
        if (!cancelled) {
          setEnrollmentChecked(true);
        }
      }
    }

    checkEnrollment();
    return () => {
      cancelled = true;
    };
  }, [resolvedParams.id, roleChecked, isManagement]);

  useEffect(() => {
    if (!roleChecked) return;

    let cancelled = false;

    async function fetchLesson() {
      setLoading(true);
      try {
        // For Admin / Content Manager / Instructor the backend includes
        // CorrectAnswer, which is what lets this page render a preview
        // with the correct option highlighted. For a Student it is
        // stripped out until they submit their attempt.
        const res = await authFetch(`/lessons/${resolvedParams.lessonId}`);
        if (!cancelled) {
          setLesson(res.data || null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "This quiz could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLesson();
    return () => {
      cancelled = true;
    };
  }, [resolvedParams.lessonId, roleChecked]);

  // A Student's previous attempt (if any) is fetched so the quiz form can
  // be replaced with a read-only review instead of being retaken.
  useEffect(() => {
    if (!roleChecked || isManagement) {
      setCheckingPrevious(false);
      return;
    }

    let cancelled = false;

    async function fetchPreviousResult() {
      setCheckingPrevious(true);
      try {
        const res = await authFetch(`/lessons/${resolvedParams.lessonId}/my-quiz-result`);
        if (!cancelled) {
          setReviewData(res.data || null);
        }
      } catch {
        if (!cancelled) {
          setReviewData(null);
        }
      } finally {
        if (!cancelled) {
          setCheckingPrevious(false);
        }
      }
    }

    fetchPreviousResult();
    return () => {
      cancelled = true;
    };
  }, [resolvedParams.lessonId, roleChecked, isManagement]);

  const handleSelectAnswer = (quizDocumentId: string, letter: string) => {
    setAnswers((prev) => ({ ...prev, [quizDocumentId]: letter }));
  };

  const quizzes = lesson?.quizzes || [];
  const allAnswered = quizzes.length > 0 && quizzes.every((q) => !!answers[q.documentId]);

  const handleSubmit = async () => {
    setSubmitError("");
    setSubmitting(true);

    try {
      await authFetch(`/lessons/${resolvedParams.lessonId}/submit-quiz`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });

      // After a successful submission, fetch the full result (with the
      // correct answers included) so the review screen renders right away.
      const reviewRes = await authFetch(`/lessons/${resolvedParams.lessonId}/my-quiz-result`);
      setReviewData(reviewRes.data || null);
    } catch (err: any) {
      setSubmitError(err?.message || "The quiz could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !roleChecked) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  if (loading || !enrollmentChecked || checkingPrevious) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading quiz…</p>
      </main>
    );
  }

  if (!isManagement && !isEnrolled) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-5">
          <div className="bg-red-950/40 border border-red-900 rounded-xl p-6">
            <p className="text-red-400 font-medium">
              You need to enroll in this course before you can take this quiz.
            </p>
          </div>
          <Link
            href={`/courses/${resolvedParams.id}`}
            className="inline-flex items-center text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            ← Back to Course
          </Link>
        </div>
      </main>
    );
  }

  if (error || !lesson) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-5">
          <div className="bg-red-950/40 border border-red-900 rounded-xl p-6">
            <p className="text-red-400 font-medium">{error || "Lesson not found."}</p>
          </div>
          <Link
            href={`/courses/${resolvedParams.id}/lessons/${resolvedParams.lessonId}`}
            className="inline-flex items-center text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            ← Back to Lesson
          </Link>
        </div>
      </main>
    );
  }

  if (quizzes.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-5">
          <p className="text-slate-400">This lesson does not have a quiz yet.</p>
          <Link
            href={`/courses/${resolvedParams.id}/lessons/${resolvedParams.lessonId}`}
            className="text-indigo-400 hover:underline"
          >
            ← Back to Lesson
          </Link>
        </div>
      </main>
    );
  }

  // ===================== Management preview (read-only) =====================
  if (isManagement) {
    return (
      <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Link
            href={`/courses/${resolvedParams.id}/lessons/${resolvedParams.lessonId}`}
            className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            ← Back to Lesson
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-white">Quiz: {lesson.Title}</h1>
            <p className="text-sm text-slate-400 mt-1">
              {quizzes.length} question{quizzes.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="space-y-4">
            {quizzes.map((quiz, idx) => (
              <div
                key={quiz.documentId}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3"
              >
                <p className="text-white font-medium">
                  {idx + 1}. {quiz.Question}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(["A", "B", "C", "D"] as const).map((letter) => {
                    const optionKey = `Option${letter}` as keyof QuizItem;
                    const optionText = quiz[optionKey] as string;
                    const isCorrect = letter === quiz.CorrectAnswer;

                    return (
                      <div
                        key={letter}
                        className={`px-3 py-2 rounded-lg border text-sm ${
                          isCorrect
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-slate-800 bg-slate-800/50 text-slate-300"
                        }`}
                      >
                        {letter}. {optionText}
                        {isCorrect && " — Correct answer"}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ===================== Review screen (already submitted) =====================
  if (reviewData) {
    const percentage = Math.round((reviewData.score / reviewData.totalQuestions) * 100);
    const passed = percentage >= 50;

    return (
      <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Link
            href={`/courses/${resolvedParams.id}/lessons/${resolvedParams.lessonId}`}
            className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            ← Back to Lesson
          </Link>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
            <h1 className="text-2xl font-bold text-white">You have already taken this quiz</h1>
            <div
              className={`text-5xl font-extrabold ${
                passed ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {reviewData.score} / {reviewData.totalQuestions}
            </div>
            <p className="text-slate-300">
              You scored <span className="font-semibold">{percentage}%</span> —{" "}
              {passed ? "well done!" : "review the material and aim higher next time."}
            </p>
            <p className="text-xs text-slate-500">
              Each quiz can only be attempted once. Your answers are compared with the
              correct answers below.
            </p>
          </div>

          <div className="space-y-4">
            {reviewData.review.map((item, idx) => {
              const isCorrect = item.yourAnswer === item.CorrectAnswer;
              return (
                <div
                  key={item.documentId}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-white font-medium">
                      {idx + 1}. {item.Question}
                    </p>
                    <span
                      className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                        isCorrect
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(["A", "B", "C", "D"] as const).map((letter) => {
                      const optionKey = `Option${letter}` as keyof ReviewItem;
                      const optionText = item[optionKey] as string;
                      const isThisCorrect = letter === item.CorrectAnswer;
                      const isYourPick = letter === item.yourAnswer;

                      let style = "border-slate-800 bg-slate-800/50 text-slate-300";
                      let tag = "";

                      if (isThisCorrect) {
                        style = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
                        tag = " — Correct answer";
                      } else if (isYourPick) {
                        style = "border-red-500/40 bg-red-500/10 text-red-300";
                        tag = " — Your answer";
                      }

                      return (
                        <div
                          key={letter}
                          className={`px-3 py-2 rounded-lg border text-sm ${style}`}
                        >
                          {letter}. {optionText}
                          {tag}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <Link
            href={`/courses/${resolvedParams.id}/lessons/${resolvedParams.lessonId}`}
            className="inline-flex bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
          >
            Back to Lesson
          </Link>
        </div>
      </main>
    );
  }

  // ===================== Quiz form (first attempt) =====================
  return (
    <main className="min-h-screen bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href={`/courses/${resolvedParams.id}/lessons/${resolvedParams.lessonId}`}
          className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline"
        >
          ← Back to Lesson
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-white">Quiz: {lesson.Title}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {quizzes.length} question{quizzes.length === 1 ? "" : "s"} — choose one answer
            for each. This quiz can only be submitted{" "}
            <span className="font-semibold">once</span>.
          </p>
        </div>

        {submitError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
            {submitError}
          </div>
        )}

        <div className="space-y-4">
          {quizzes.map((quiz, idx) => (
            <div
              key={quiz.documentId}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3"
            >
              <p className="text-white font-medium">
                {idx + 1}. {quiz.Question}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  const optionKey = `Option${letter}` as keyof QuizItem;
                  const optionText = quiz[optionKey] as string;
                  const selected = answers[quiz.documentId] === letter;

                  return (
                    <label
                      key={letter}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selected
                          ? "border-indigo-500 bg-indigo-500/10 text-white"
                          : "border-slate-800 bg-slate-800/50 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`quiz-${quiz.documentId}`}
                        checked={selected}
                        onChange={() => handleSelectAnswer(quiz.documentId, letter)}
                        className="shrink-0"
                      />
                      <span className="text-sm">
                        {letter}. {optionText}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
        >
          {submitting ? "Submitting…" : allAnswered ? "Submit Quiz" : "Answer all questions"}
        </button>
      </div>
    </main>
  );
}