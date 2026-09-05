"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { learningApi, type MockActive, type MockSubmission } from "@/lib/api-client";
import type { SubjectKey } from "@/lib/subjects";

const formatTime = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
};
const hasAnswer = (value: number | string | undefined) => value !== undefined && String(value).trim() !== "";

export function MockSession({ subject }: { subject: SubjectKey }) {
  const router = useRouter();
  const subjectCode = subject.toUpperCase() as "A" | "B";
  const latestActive = useRef<MockActive | null>(null);
  const submittingRef = useRef(false);
  const [active, setActive] = useState<MockActive | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submission, setSubmission] = useState<MockSubmission | null>(null);
  const [error, setError] = useState("");
  const isRunning = Boolean(active) && !submission;

  useEffect(() => {
    let mounted = true;
    learningApi.getActiveMock(subjectCode)
      .then((value) => {
        if (!mounted) return;
        setActive(value);
        latestActive.current = value;
      })
      .catch((loadError: unknown) => { if (mounted) setError(loadError instanceof Error ? loadError.message : "模擬テストを読み込めませんでした。"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [subjectCode]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setActive((current) => {
        if (!current || current.remainingSeconds <= 0) return current;
        const next = { ...current, remainingSeconds: current.remainingSeconds - 1 };
        latestActive.current = next;
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const persist = useCallback(async (value?: MockActive | null) => {
    const current = value ?? latestActive.current;
    if (!current || submittingRef.current) return;
    setSaving(true);
    try {
      await learningApi.saveActiveMock(subjectCode, current.answers, current.remainingSeconds);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "回答を自動保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }, [subjectCode]);

  useEffect(() => {
    if (!isRunning) return;
    const autosave = window.setInterval(() => { void persist(); }, 30000);
    return () => window.clearInterval(autosave);
  }, [isRunning, persist]);

  const submit = useCallback(async () => {
    if (!latestActive.current || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await learningApi.saveActiveMock(subjectCode, latestActive.current.answers, latestActive.current.remainingSeconds);
      const result = await learningApi.submitMock(subjectCode);
      setSubmission(result);
      setConfirmSubmit(false);
    } catch (submitError) {
      submittingRef.current = false;
      setError(submitError instanceof Error ? submitError.message : "模擬テストを提出できませんでした。");
    } finally {
      setSaving(false);
    }
  }, [subjectCode]);

  useEffect(() => {
    if (active?.remainingSeconds === 0 && !submission && !submittingRef.current) void submit();
  }, [active?.remainingSeconds, submission, submit]);

  const updateAnswer = (questionId: string, value: number | string) => {
    setActive((current) => {
      if (!current) return current;
      const next = { ...current, answers: { ...current.answers, [questionId]: value } };
      latestActive.current = next;
      return next;
    });
  };
  const move = async (nextIndex: number) => {
    await persist();
    setIndex(nextIndex);
    setError("");
  };
  const pause = async () => {
    await persist();
    router.push(`/study/${subject}/mock`);
  };

  if (loading) return <main className="grid min-h-[60vh] place-items-center px-6"><p className="text-slate-600">模擬テストを読み込んでいます…</p></main>;
  if (!active && !submission) return <main className="mx-auto max-w-3xl px-5 py-12 text-center"><h1 className="text-2xl font-semibold">未完了の模擬テストがありません</h1>{error && <p className="mt-4 text-red-700" role="alert">{error}</p>}<Link href={`/study/${subject}/mock`} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-5 font-medium text-white">試験条件へ戻る</Link></main>;

  if (submission) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <p className="font-medium text-indigo-600">科目{subjectCode}・模擬テスト</p>
        <h1 className="mt-2 text-3xl font-semibold">今回の試験結果</h1>
        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-8 text-center"><p className="text-slate-600">今回の正答率</p><p className="mt-2 text-5xl font-semibold text-indigo-700">{submission.session.scoreRate}%</p><p className="mt-3">{submission.session.correctCount} / {submission.session.answeredCount}問正解</p></section>
        <h2 className="mt-9 text-2xl font-semibold">問題一覧</h2>
        <ol className="mt-4 grid gap-4">
          {submission.results.map((result, resultIndex) => <li key={result.questionId} className={`rounded-2xl border p-5 ${result.correct ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><p className="font-semibold">問{resultIndex + 1}　{result.correct ? "○ 正解" : "× 不正解"}</p><p className="mt-2 text-slate-800">{result.question?.prompt}</p><details className="mt-3"><summary className="cursor-pointer font-medium text-indigo-700">正解と解説を表示</summary><p className="mt-3 font-medium">正解: {result.modelAnswer}</p><p className="mt-2 leading-7 text-slate-700">{result.explanation}</p><p className="mt-2 text-sm text-slate-600">出典: {result.source?.label}</p></details></li>)}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/history" className="inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-5 font-medium text-white">履歴を見る</Link><Link href={`/study/${subject}/mock`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 font-medium">新しく開始</Link></div>
      </main>
    );
  }

  const question = active!.questions[index];
  const answeredCount = Object.values(active!.answers).filter(hasAnswer).length;
  const unansweredCount = active!.questions.length - answeredCount;
  if (!question) return null;
  const value = active!.answers[question.questionId];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <header className="sticky top-0 z-10 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-500">科目{subjectCode} 模擬テスト</p><p className="font-semibold">回答済み {answeredCount} / {active!.questions.length}問</p></div><div className="text-right"><p className="text-sm text-slate-500">残り時間</p><p className={`font-mono text-2xl font-semibold ${active!.remainingSeconds <= 600 ? "text-red-700" : "text-slate-950"}`}>{formatTime(active!.remainingSeconds)}</p></div></div>
        <p className="mt-2 text-right text-xs text-slate-500" aria-live="polite">{saving ? "保存中…" : "自動保存有効"}</p>
      </header>
      {active!.questions.length < active!.configuredQuestionCount && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">機能検証用問題バンクのため、今回は登録済みの{active!.questions.length}問で実施します。本番設定は{active!.configuredQuestionCount}問です。</p>}
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700" role="alert">{error}</p>}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_16rem]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
          <p className="text-sm font-medium text-indigo-700">問{index + 1} ・ {question.category}</p>
          <h1 className="mt-3 text-xl font-semibold leading-9 sm:text-2xl">{question.prompt}</h1>
          {question.answerKind === "CHOICE" ? <fieldset className="mt-6 grid gap-3"><legend className="sr-only">解答選択肢</legend>{(question.choices ?? []).map((choice, choiceIndex) => <label key={choice} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 ${value === choiceIndex ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}><input type="radio" name={`answer-${question.questionId}`} checked={value === choiceIndex} onChange={() => { updateAnswer(question.questionId, choiceIndex); window.setTimeout(() => void persist(latestActive.current), 0); }} /><span>{["ア", "イ", "ウ", "エ"][choiceIndex]}　{choice}</span></label>)}</fieldset> : <div className="mt-6"><label htmlFor="mock-answer" className="font-medium">あなたの回答</label><textarea id="mock-answer" value={typeof value === "string" ? value : ""} onChange={(event) => updateAnswer(question.questionId, event.target.value)} onBlur={() => void persist()} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 p-4" /></div>}
          <div className="mt-7 flex flex-wrap justify-between gap-3"><button type="button" disabled={index === 0 || saving} onClick={() => void move(index - 1)} className="min-h-11 rounded-xl border border-slate-300 px-5 font-medium disabled:text-slate-300">前の問題</button><button type="button" disabled={index + 1 >= active!.questions.length || saving} onClick={() => void move(index + 1)} className="min-h-11 rounded-xl bg-indigo-600 px-5 font-medium text-white disabled:bg-slate-300">次の問題</button></div>
        </section>
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 lg:self-start"><h2 className="font-semibold">問題一覧</h2><div className="mt-3 grid grid-cols-5 gap-2 lg:grid-cols-4">{active!.questions.map((item, itemIndex) => <button type="button" key={item.questionId} onClick={() => void move(itemIndex)} aria-label={`問${itemIndex + 1}${hasAnswer(active!.answers[item.questionId]) ? " 回答済み" : " 未回答"}`} className={`min-h-10 rounded-lg border text-sm font-medium ${itemIndex === index ? "border-indigo-600 bg-indigo-600 text-white" : hasAnswer(active!.answers[item.questionId]) ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200"}`}>{itemIndex + 1}</button>)}</div><button type="button" onClick={() => setConfirmSubmit(true)} className="mt-5 min-h-11 w-full rounded-xl bg-slate-900 px-4 font-medium text-white">提出する</button><button type="button" onClick={() => void pause()} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 font-medium">中断して戻る</button></aside>
      </div>
      {confirmSubmit && <div className="fixed inset-0 z-20 grid place-items-center bg-slate-950/50 p-5" role="dialog" aria-modal="true" aria-labelledby="submit-title"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"><h2 id="submit-title" className="text-xl font-semibold">模擬テストを提出しますか？</h2><p className="mt-3 text-slate-700">未回答は{unansweredCount}問です。提出後は回答を変更できません。</p><div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" disabled={saving} onClick={() => setConfirmSubmit(false)} className="min-h-11 rounded-xl border border-slate-300 px-5 font-medium">戻る</button><button type="button" disabled={saving} onClick={() => void submit()} className="min-h-11 rounded-xl bg-red-700 px-5 font-medium text-white disabled:bg-slate-300">提出を確定</button></div></div></div>}
    </main>
  );
}
