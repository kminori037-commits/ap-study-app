"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { learningApi, type GradeResult, type Question } from "@/lib/api-client";
import type { SubjectKey } from "@/lib/subjects";

type Stats = { answered: number; correct: number };

export function SampleQuestion({ subject, category, filter }: { subject: SubjectKey; category: string; filter: string }) {
  const router = useRouter();
  const subjectCode = subject.toUpperCase() as "A" | "B";
  const startedAt = useRef<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [stats, setStats] = useState<Stats>({ answered: 0, correct: 0 });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let active = true;
    startedAt.current = Date.now();
    Promise.all([
      learningApi.getQuestions(subjectCode, category, filter),
      learningApi.getBookmarks(),
    ])
      .then(([loadedQuestions, bookmarks]) => {
        if (!active) return;
        setQuestions(loadedQuestions);
        setBookmarkedIds(new Set(bookmarks.map((item) => item.questionId)));
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "問題を読み込めませんでした。");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category, filter, subjectCode]);

  const current = questions[index];
  const answerValue = subject === "a" ? selected : textAnswer.trim();
  const canAnswer = subject === "a" ? selected !== null : textAnswer.trim().length > 0;

  const submitAnswer = async () => {
    if (!current || !canAnswer || grade) return;
    setPending(true);
    setError("");
    try {
      const result = await learningApi.gradeQuestion(current.questionId, subjectCode, answerValue as number | string);
      setGrade(result);
      setStats((value) => ({ answered: value.answered + 1, correct: value.correct + (result.correct ? 1 : 0) }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "採点できませんでした。");
    } finally {
      setPending(false);
    }
  };

  const saveAndFinish = async () => {
    if (stats.answered === 0) {
      router.push(`/study/${subject}`);
      return;
    }
    setPending(true);
    setError("");
    try {
      await learningApi.saveSession({
        subject: subjectCode,
        mode: "QUIZ",
        answeredCount: stats.answered,
        correctCount: stats.correct,
        durationSeconds: Math.max(1, Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000)),
      });
      setFinished(true);
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "学習結果を保存できませんでした。");
    } finally {
      setPending(false);
    }
  };

  const nextQuestion = () => {
    if (index + 1 >= questions.length) {
      void saveAndFinish();
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
    setTextAnswer("");
    setGrade(null);
    setError("");
  };

  const toggleBookmark = async () => {
    if (!current) return;
    setPending(true);
    setError("");
    try {
      const next = new Set(bookmarkedIds);
      if (next.has(current.questionId)) {
        await learningApi.deleteBookmark(current.questionId);
        next.delete(current.questionId);
      } else {
        await learningApi.saveBookmark(current.questionId, { subject: subjectCode, category: current.category });
        next.add(current.questionId);
      }
      setBookmarkedIds(next);
    } catch (bookmarkError) {
      setError(bookmarkError instanceof Error ? bookmarkError.message : "ブックマークを更新できませんでした。");
    } finally {
      setPending(false);
    }
  };

  if (loading) return <main className="grid min-h-[60vh] place-items-center px-6"><p className="text-slate-600">問題を読み込んでいます…</p></main>;

  if (finished) {
    const scoreRate = Math.round((stats.correct / stats.answered) * 1000) / 10;
    return (
      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <p className="font-medium text-blue-600">科目{subjectCode}・一問一答</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">今回の学習結果</h1>
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">今回の正答率</p>
          <p className="mt-2 text-5xl font-semibold text-blue-700">{scoreRate}%</p>
          <p className="mt-3 text-slate-700">{stats.correct} / {stats.answered}問正解</p>
        </section>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/history" className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 font-medium text-white">履歴を見る</Link><Link href={`/study/${subject}/quiz`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 font-medium">新しく開始</Link></div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-12 text-center sm:px-8">
        <h1 className="text-2xl font-semibold">条件に合う問題がありません</h1>
        <p className="mt-3 text-slate-600">分野または絞り込み条件を変更してください。</p>
        {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
        <Link href={`/study/${subject}/quiz`} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-5 font-medium text-white">出題条件へ戻る</Link>
      </main>
    );
  }

  const bookmarked = bookmarkedIds.has(current.questionId);
  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>科目{subjectCode} ・ {current.category}</span>
        <button type="button" aria-pressed={bookmarked} disabled={pending} onClick={toggleBookmark} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 font-medium text-slate-700 disabled:text-slate-400">{bookmarked ? "★ 保存済み" : "☆ ブックマーク"}</button>
      </div>
      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
      <div className="mt-4 flex items-center justify-between gap-4 text-sm"><strong>問題 {index + 1} / {questions.length}</strong><span className="text-slate-500">最大100問</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="学習進捗" aria-valuenow={index + 1} aria-valuemin={0} aria-valuemax={questions.length}><span className="block h-full bg-blue-600" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div>
      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
        <h1 className="text-xl font-semibold leading-9 text-slate-950 sm:text-2xl">{current.prompt}</h1>
        {current.answerKind === "CHOICE" ? (
          <fieldset className="mt-6 grid gap-3" disabled={Boolean(grade) || pending}>
            <legend className="sr-only">解答選択肢</legend>
            {(current.choices ?? []).map((choice, choiceIndex) => (
              <label key={choice} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 ${selected === choiceIndex ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                <input type="radio" name="answer" checked={selected === choiceIndex} onChange={() => setSelected(choiceIndex)} />
                <span>{["ア", "イ", "ウ", "エ"][choiceIndex]}　{choice}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <div className="mt-6"><label htmlFor="written-answer" className="font-medium">あなたの回答</label><textarea id="written-answer" value={textAnswer} disabled={Boolean(grade) || pending} onChange={(event) => setTextAnswer(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-4 text-base" /></div>
        )}
        {grade && (
          <div className={`mt-6 rounded-2xl border p-5 ${grade.correct ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`} role="status">
            <h2 className="font-semibold text-slate-950">{grade.correct ? "○ 正解です" : "× 不正解です"}</h2>
            <p className="mt-2 font-medium text-slate-800">正解: {grade.modelAnswer}</p>
            <p className="mt-3 leading-7 text-slate-700">{grade.explanation}</p>
            {grade.source && <p className="mt-3 text-sm text-slate-600">出典: {grade.source.label}</p>}
          </div>
        )}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button type="button" disabled={pending} onClick={() => void saveAndFinish()} className="min-h-11 rounded-xl border border-slate-300 px-5 font-medium text-slate-700">学習を終了</button>
          {grade ? <button type="button" disabled={pending} onClick={nextQuestion} className="min-h-11 rounded-xl bg-blue-600 px-6 font-medium text-white disabled:bg-slate-300">{index + 1 >= questions.length ? "結果を見る" : "次の問題"}</button> : <button type="button" disabled={!canAnswer || pending} onClick={() => void submitAnswer()} className="min-h-11 rounded-xl bg-blue-600 px-6 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300">回答する</button>}
        </div>
      </section>
    </main>
  );
}
