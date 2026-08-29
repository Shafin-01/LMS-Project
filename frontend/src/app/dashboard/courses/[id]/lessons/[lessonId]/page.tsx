"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth";
import RoleGuard from "@/components/RoleGuard";

interface LessonData {
  id: number;
  documentId: string;
  Title: string;
  Content: string;
  VideoURL: string | null;
  isPublished: boolean;
}

interface QuizItem {
  id: number;
  documentId: string;
  Question: string;
  OptionA: string;
  OptionB: string;
  OptionC: string;
  OptionD: string;
  CorrectAnswer: string;
}

interface QuizForm {
  Question: string;
  OptionA: string;
  OptionB: string;
  OptionC: string;
  OptionD: string;
  CorrectAnswer: string;
}

const EMPTY_QUIZ_FORM: QuizForm = {
  Question: "",
  OptionA: "",
  OptionB: "",
  OptionC: "",
  OptionD: "",
  CorrectAnswer: "",
};

function LessonManageContent({
  courseId,
  lessonId,
}: {
  courseId: string;
  lessonId: string;
}) {
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [publishLoading, setPublishLoading] = useState(false);
  const [deletingLesson, setDeletingLesson] = useState(false);

  const [newQuiz, setNewQuiz] = useState<QuizForm>(EMPTY_QUIZ_FORM);
  const [addingQuiz, setAddingQuiz] = useState(false);
  const [addQuizError, setAddQuizError] = useState("");

  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [editQuizForm, setEditQuizForm] = useState<QuizForm>(EMPTY_QUIZ_FORM);
  const [savingQuizId, setSavingQuizId] = useState<string | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);

  const router = useRouter();

  const loadQuizzes = async () => {
    // Quiz list আলাদা filtered query (`/quizzes?filters[lesson]...`) দিয়ে না এনে,
    // lesson-এর নিজের findOne()-এ যে quizzes populate করা আছে সেখান থেকে আনছি।
    // কারণ: lesson unpublish (draft) অবস্থায় থাকলে relation-filter দিয়ে করা
    // আলাদা query ফাঁকা array ফেরত দিচ্ছিল — এমনকি creator/Admin-এর জন্যও।
    // lesson-এর populate সরাসরি ওই নির্দিষ্ট document-এর quiz টেনে আনে,
    // lesson-এর publish status যাই হোক না কেন, তাই এটা reliable।
    const res = await authFetch(`/lessons/${lessonId}`);
    setQuizzes(res.data?.quizzes || []);
  };

  const loadData = async () => {
    setError("");
    try {
      // lesson.ts এর findOne() override status query param ধরে না, নিজে থেকেই
      // সবসময় draft (সবচেয়ে latest edit) ফেরত দেয় — এটাই আমরা চাই এই edit ফর্মে।
      // এই একই response-এ populate করা quizzes-ও চলে আসে, তাই আলাদা করে
      // loadQuizzes() কল না করে এখান থেকেই সরাসরি set করে দিচ্ছি (extra
      // network call বাঁচলো)।
      const lessonRes = await authFetch(`/lessons/${lessonId}`);
      const lessonData = lessonRes.data;

      if (!lessonData) {
        setError("Lesson পাওয়া যায়নি।");
        setLoading(false);
        return;
      }

      let isPublished = false;
      try {
        const publishedCheck = await authFetch(
          `/lessons?filters[documentId][$eq]=${lessonId}&status=published`
        );
        isPublished = (publishedCheck.data || []).length > 0;
      } catch {
        isPublished = false;
      }

      setLesson({ ...lessonData, isPublished });
      setTitle(lessonData.Title || "");
      setContent(lessonData.Content || "");
      setVideoUrl(lessonData.VideoURL || "");
      setQuizzes(lessonData.quizzes || []);
    } catch (err: any) {
      setError(err.message || "Lesson load করা যায়নি।");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage("");
    setError("");

    try {
      await authFetch(`/lessons/${lessonId}`, {
        method: "PUT",
        body: JSON.stringify({
          data: { Title: title, Content: content, VideoURL: videoUrl || null },
        }),
      });
      setSaveMessage("Lesson update হয়েছে। ✅");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Update করা যায়নি।");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!lesson) return;
    setPublishLoading(true);
    setError("");

    try {
      const action = lesson.isPublished ? "unpublish" : "publish";
      await authFetch(`/lessons/${lessonId}/actions/${action}`, {
        method: "POST",
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || "Publish/Unpublish করা যায়নি।");
    } finally {
      setPublishLoading(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (
      !window.confirm(
        "তুমি কি নিশ্চিত এই Lesson delete করতে চাও? এর সব Quiz question-ও delete হয়ে যাবে!"
      )
    )
      return;

    setDeletingLesson(true);
    try {
      await authFetch(`/lessons/${lessonId}`, { method: "DELETE" });
      router.push(`/dashboard/courses/${courseId}`);
    } catch (err: any) {
      setError(err.message || "Delete করা যায়নি।");
      setDeletingLesson(false);
    }
  };

  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddQuizError("");

    if (!newQuiz.CorrectAnswer) {
      setAddQuizError("কোনটা সঠিক উত্তর সেটা বেছে নাও (A/B/C/D)।");
      return;
    }

    setAddingQuiz(true);
    try {
      await authFetch("/quizzes", {
        method: "POST",
        body: JSON.stringify({
          data: { ...newQuiz, lesson: lessonId },
        }),
      });
      setNewQuiz(EMPTY_QUIZ_FORM);
      await loadQuizzes();
    } catch (err: any) {
      setAddQuizError(err.message || "Quiz question যোগ করা যায়নি।");
    } finally {
      setAddingQuiz(false);
    }
  };

  const handleStartEditQuiz = (quiz: QuizItem) => {
    setEditingQuizId(quiz.documentId);
    setEditQuizForm({
      Question: quiz.Question,
      OptionA: quiz.OptionA,
      OptionB: quiz.OptionB,
      OptionC: quiz.OptionC,
      OptionD: quiz.OptionD,
      CorrectAnswer: quiz.CorrectAnswer,
    });
  };

  const handleCancelEditQuiz = () => {
    setEditingQuizId(null);
    setEditQuizForm(EMPTY_QUIZ_FORM);
  };

  const handleSaveEditQuiz = async (quizDocId: string) => {
    if (!editQuizForm.CorrectAnswer) {
      alert("কোনটা সঠিক উত্তর সেটা বেছে নাও (A/B/C/D)।");
      return;
    }

    setSavingQuizId(quizDocId);
    try {
      await authFetch(`/quizzes/${quizDocId}`, {
        method: "PUT",
        body: JSON.stringify({ data: editQuizForm }),
      });
      setEditingQuizId(null);
      await loadQuizzes();
    } catch (err: any) {
      alert(err.message || "Quiz question update করা যায়নি।");
    } finally {
      setSavingQuizId(null);
    }
  };

  const handleDeleteQuiz = async (quizDocId: string) => {
    if (!window.confirm("এই quiz question delete করতে চাও?")) return;

    setDeletingQuizId(quizDocId);
    try {
      await authFetch(`/quizzes/${quizDocId}`, { method: "DELETE" });
      await loadQuizzes();
    } catch (err: any) {
      alert(err.message || "Delete করা যায়নি।");
    } finally {
      setDeletingQuizId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  if (!lesson) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error || "Lesson পাওয়া যায়নি।"}</p>
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="text-sm text-indigo-400 hover:underline"
        >
          ← Back to Course
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-slate-100 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="text-sm text-indigo-400 hover:underline"
        >
          ← Back to Course
        </Link>

        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Manage Lesson: {lesson.Title}</h1>
            <span
              className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                lesson.isPublished
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}
            >
              {lesson.isPublished ? "Published" : "Draft"}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTogglePublish}
              disabled={publishLoading}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              {publishLoading ? "..." : lesson.isPublished ? "Unpublish" : "Publish"}
            </button>
            <button
              onClick={handleDeleteLesson}
              disabled={deletingLesson}
              className="bg-red-600/10 hover:bg-red-600/20 disabled:opacity-50 text-red-400 text-sm font-medium px-4 py-2 rounded-lg"
            >
              {deletingLesson ? "Deleting..." : "Delete Lesson"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Lesson info edit */}
        <form
          onSubmit={handleSaveLesson}
          className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-6"
        >
          <h2 className="text-lg font-bold text-white">Lesson Info</h2>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Video URL (embed link, optional)
            </label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/embed/..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Text Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {saveMessage && <span className="text-xs text-slate-400">{saveMessage}</span>}
          </div>
        </form>

        {/* Quiz management */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Quiz Questions</h2>

          {quizzes.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400 text-sm">
              এখনো কোনো quiz question নেই।
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz, idx) => (
                <div
                  key={quiz.documentId}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5"
                >
                  {editingQuizId === quiz.documentId ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Question
                        </label>
                        <input
                          value={editQuizForm.Question}
                          onChange={(e) =>
                            setEditQuizForm({ ...editQuizForm, Question: e.target.value })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>
                      {(["A", "B", "C", "D"] as const).map((letter) => {
                        const key = `Option${letter}` as keyof QuizForm;
                        return (
                          <div key={letter} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`edit-correct-${quiz.documentId}`}
                              checked={editQuizForm.CorrectAnswer === letter}
                              onChange={() =>
                                setEditQuizForm({ ...editQuizForm, CorrectAnswer: letter })
                              }
                              className="shrink-0"
                            />
                            <span className="text-xs text-slate-500 w-4">{letter}</span>
                            <input
                              value={editQuizForm[key]}
                              onChange={(e) =>
                                setEditQuizForm({ ...editQuizForm, [key]: e.target.value })
                              }
                              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                            />
                          </div>
                        );
                      })}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleSaveEditQuiz(quiz.documentId)}
                          disabled={savingQuizId === quiz.documentId}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
                        >
                          {savingQuizId === quiz.documentId ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={handleCancelEditQuiz}
                          className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-3">
                        <p className="text-white font-medium">
                          {idx + 1}. {quiz.Question}
                        </p>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleStartEditQuiz(quiz)}
                            className="text-sm text-indigo-400 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuiz(quiz.documentId)}
                            disabled={deletingQuizId === quiz.documentId}
                            className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            {deletingQuizId === quiz.documentId ? "..." : "Delete"}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                        {(["A", "B", "C", "D"] as const).map((letter) => {
                          const key = `Option${letter}` as keyof QuizItem;
                          const isCorrect = quiz.CorrectAnswer === letter;
                          return (
                            <div
                              key={letter}
                              className={`px-3 py-1.5 rounded-lg border ${
                                isCorrect
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                  : "border-slate-800 bg-slate-800/50 text-slate-300"
                              }`}
                            >
                              {letter}. {quiz[key]} {isCorrect && "✓"}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new question */}
          <form
            onSubmit={handleAddQuiz}
            className="space-y-3 bg-slate-900 border border-slate-800 rounded-xl p-6"
          >
            <h3 className="text-sm font-bold text-white">+ Add New Question</h3>

            {addQuizError && <p className="text-red-400 text-xs">{addQuizError}</p>}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Question</label>
              <input
                value={newQuiz.Question}
                onChange={(e) => setNewQuiz({ ...newQuiz, Question: e.target.value })}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="প্রশ্ন লেখো..."
              />
            </div>

            {(["A", "B", "C", "D"] as const).map((letter) => {
              const key = `Option${letter}` as keyof QuizForm;
              return (
                <div key={letter} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="new-correct-answer"
                    checked={newQuiz.CorrectAnswer === letter}
                    onChange={() => setNewQuiz({ ...newQuiz, CorrectAnswer: letter })}
                    className="shrink-0"
                  />
                  <span className="text-xs text-slate-500 w-4">{letter}</span>
                  <input
                    value={newQuiz[key]}
                    onChange={(e) => setNewQuiz({ ...newQuiz, [key]: e.target.value })}
                    required
                    placeholder={`Option ${letter}`}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              );
            })}

            <p className="text-[11px] text-slate-500">
              রেডিও বাটন ক্লিক করে বেছে নাও কোন Option-টা সঠিক উত্তর।
            </p>

            <button
              type="submit"
              disabled={addingQuiz}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
            >
              {addingQuiz ? "Adding..." : "Question যোগ করো"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function LessonManagePage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <RoleGuard allowedRoles={["Admin", "Content Manager", "Instructor"]}>
      {() => (
        <LessonManageContent
          courseId={resolvedParams.id}
          lessonId={resolvedParams.lessonId}
        />
      )}
    </RoleGuard>
  );
}