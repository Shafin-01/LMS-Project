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

export default function QuizPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
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

  // Hydration mismatch এড়ানোর জন্য — Navbar/EnrollButton-এ যেভাবে করা হয়েছিল সেভাবেই।
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      setEnrollmentChecked(true);
      return;
    }

    let cancelled = false;

    async function checkEnrollment() {
      try {
        const res = await authFetch(
          `/enrollments/my-enrollment/${resolvedParams.id}`
        );
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
  }, [resolvedParams.id]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLesson() {
      setLoading(true);
      try {
        // এখানে CorrectAnswer আসে না — lesson.ts এর findOne() Student-দের
        // জন্য এটা আগে থেকেই বাদ দিয়ে দেয়, তাই এখানে সরাসরি ব্যবহার করা নিরাপদ।
        const res = await authFetch(`/lessons/${resolvedParams.lessonId}`);
        if (!cancelled) {
          setLesson(res.data || null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Quiz load করা যায়নি।");
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
  }, [resolvedParams.lessonId]);

  // আগে quiz দেওয়া থাকলে তার score + review আনছি — থাকলে ফর্মের বদলে সরাসরি
  // review দেখানো হবে, নতুন করে দেওয়ার সুযোগ থাকবে না।
  useEffect(() => {
    let cancelled = false;

    async function fetchPreviousResult() {
      setCheckingPrevious(true);
      try {
        const res = await authFetch(
          `/lessons/${resolvedParams.lessonId}/my-quiz-result`
        );
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
  }, [resolvedParams.lessonId]);

  const handleSelectAnswer = (quizDocumentId: string, letter: string) => {
    setAnswers((prev) => ({ ...prev, [quizDocumentId]: letter }));
  };

  const quizzes = lesson?.quizzes || [];
  const allAnswered =
    quizzes.length > 0 && quizzes.every((q) => !!answers[q.documentId]);

  const handleSubmit = async () => {
    setSubmitError("");
    setSubmitting(true);

    try {
      await authFetch(`/lessons/${resolvedParams.lessonId}/submit-quiz`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });

      // Submit সফল হলে review-সহ পুরো result আবার fetch করছি, যাতে score
      // আর প্রতিটা প্রশ্নের সঠিক উত্তর একসাথে review screen-এ দেখানো যায়।
      const reviewRes = await authFetch(
        `/lessons/${resolvedParams.lessonId}/my-quiz-result`
      );
      setReviewData(reviewRes.data || null);
    } catch (err: any) {
      setSubmitError(err?.message || "Quiz submit করা যায়নি।");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  if (loading || !enrollmentChecked || checkingPrevious) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Quiz load হচ্ছে...</p>
      </main>
    );
  }

  if (!isEnrolled) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-5">
          <div className="bg-red-950/40 border border-red-900 rounded-xl p-6">
            <p className="text-red-400 font-medium">
              Quiz দিতে হলে আগে এই course-এ enroll করতে হবে।
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
            <p className="text-red-400 font-medium">
              {error || "Lesson পাওয়া যায়নি।"}
            </p>
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

  // ===================== Review screen (আগে দেওয়া থাকলে) =====================
  if (reviewData) {
    const percentage = Math.round(
      (reviewData.score / reviewData.totalQuestions) * 100
    );
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
            <h1 className="text-2xl font-bold text-white">তুমি এই Quiz আগেই দিয়েছ</h1>
            <div
              className={`text-5xl font-extrabold ${
                passed ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {reviewData.score} / {reviewData.totalQuestions}
            </div>
            <p className="text-slate-300">
              তুমি <span className="font-semibold">{percentage}%</span> নম্বর পেয়েছিলে —{" "}
              {passed ? "চমৎকার! 🎉" : "আরেকটু চেষ্টা করলে ভালো হতো।"}
            </p>
            <p className="text-xs text-slate-500">
              এই quiz একবারই দেওয়া যায়, তাই আবার দেওয়া যাবে না। নিচে তোমার উত্তর
              আর সঠিক উত্তর মিলিয়ে দেখতে পারো।
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
                      {isCorrect ? "সঠিক" : "ভুল"}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(["A", "B", "C", "D"] as const).map((letter) => {
                      const optionKey = `Option${letter}` as keyof ReviewItem;
                      const optionText = item[optionKey] as string;
                      const isThisCorrect = letter === item.CorrectAnswer;
                      const isYourPick = letter === item.yourAnswer;

                      let style =
                        "border-slate-800 bg-slate-800/50 text-slate-300";
                      let tag = "";

                      if (isThisCorrect) {
                        style =
                          "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
                        tag = " ✓ সঠিক উত্তর";
                      } else if (isYourPick) {
                        style = "border-red-500/40 bg-red-500/10 text-red-300";
                        tag = " ✗ তোমার উত্তর";
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

  if (quizzes.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-5">
          <p className="text-slate-400">এই lesson-এ কোনো quiz নেই।</p>
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

  // ===================== Quiz form (প্রথমবার দেওয়ার জন্য) =====================
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
            মোট {quizzes.length}টা প্রশ্ন — প্রতিটার একটা করে উত্তর বেছে নাও। মনে রাখবে,
            এই quiz <span className="font-semibold">একবারই</span> দেওয়া যাবে।
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
          {submitting
            ? "জমা দেওয়া হচ্ছে..."
            : allAnswered
            ? "Quiz জমা দাও"
            : "সব প্রশ্নের উত্তর দাও"}
        </button>
      </div>
    </main>
  );
}