"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { learningApi, type MockActive } from "@/lib/api-client";
import type { SubjectKey } from "@/lib/subjects";

const optionalBFields = ["サービスマネジメント", "プロジェクトマネジメント", "経営戦略", "システム監査", "データベース"];
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}分${seconds % 60}秒`;

export function MockSetup({ subject }: { subject: SubjectKey }) {
  const router = useRouter();
  const subjectCode = subject.toUpperCase() as "A" | "B";
  const [selected, setSelected] = useState(optionalBFields.slice(0, 4));
  const [active, setActive] = useState<MockActive | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    learningApi.getActiveMock(subjectCode)
      .then((value) => { if (mounted) setActive(value); })
      .catch((loadError: unknown) => { if (mounted) setError(loadError instanceof Error ? loadError.message : "未完了テストを確認できませんでした。"); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [subjectCode]);

  const toggle = (field: string) => setSelected((current) => current.includes(field) ? current.filter((item) => item !== field) : current.length < 4 ? [...current, field] : current);
  const start = async (discardExisting = false) => {
    setBusy(true);
    setError("");
    try {
      if (discardExisting) await learningApi.discardActiveMock(subjectCode);
      await learningApi.startMock(subjectCode, subject === "b" ? selected : []);
      router.push(`/study/${subject}/mock/session`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "模擬テストを開始できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="mt-8 text-slate-600" aria-live="polite">未完了テストを確認しています…</p>;

  if (active) {
    const answered = Object.values(active.answers).filter((value) => String(value).trim() !== "").length;
    return (
      <section className="mt-8 rounded-3xl border border-indigo-200 bg-white p-5 sm:p-8">
        <p className="font-medium text-indigo-700">未完了の科目{subjectCode}模擬テストがあります</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">続きから再開できます</h2>
        <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2"><div><dt className="text-sm text-slate-500">回答済み</dt><dd className="mt-1 font-semibold">{answered} / {active.questions.length}問</dd></div><div><dt className="text-sm text-slate-500">残り時間</dt><dd className="mt-1 font-semibold">{formatTime(active.remainingSeconds)}</dd></div></dl>
        {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
        {!confirmNew ? (
          <div className="mt-6 flex flex-wrap gap-3"><Link href={`/study/${subject}/mock/session`} className="inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-5 font-medium text-white">続きから再開</Link><button type="button" onClick={() => setConfirmNew(true)} className="min-h-11 rounded-xl border border-amber-300 px-5 font-medium text-amber-800">新しく開始</button><Link href={`/study/${subject}`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 font-medium">キャンセル</Link></div>
        ) : (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="font-medium text-amber-950">以前の未完了テストと回答を削除して、新しく開始しますか？</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void start(true)} className="min-h-11 rounded-xl bg-amber-700 px-5 font-medium text-white disabled:bg-slate-300">削除して新しく開始</button><button type="button" disabled={busy} onClick={() => setConfirmNew(false)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-medium">戻る</button></div></div>
        )}
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
      <dl className="grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
        <div><dt className="text-sm text-slate-500">本番の問題数</dt><dd className="mt-1 text-xl font-semibold">{subject === "a" ? "80問" : "5問"}</dd></div>
        <div><dt className="text-sm text-slate-500">試験時間</dt><dd className="mt-1 text-xl font-semibold">150分</dd></div>
      </dl>
      <p className="mt-4 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-900">現在は独自の機能検証用問題を使用します。科目Aは登録問題が80問に満たない間、登録済み問題数で出題します。タイマー、途中保存、再開、提出、採点は本番仕様です。</p>
      {subject === "b" && (
        <fieldset className="mt-7">
          <legend className="font-semibold text-slate-950">回答する分野</legend>
          <p className="mt-2 text-sm text-slate-600">情報セキュリティは必須です。残り5分野から4分野を選択してください。</p>
          <label className="mt-4 flex min-h-12 items-center gap-3 rounded-xl border border-blue-300 bg-blue-50 p-4 font-medium text-blue-800"><input type="checkbox" checked disabled />情報セキュリティ（必須）</label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {optionalBFields.map((field) => <label key={field} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-4 ${selected.includes(field) ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}><input type="checkbox" checked={selected.includes(field)} onChange={() => toggle(field)} />{field}</label>)}
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">選択中: {selected.length} / 4分野</p>
        </fieldset>
      )}
      {error && <p className="mt-4 text-red-700" role="alert">{error}</p>}
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href={`/study/${subject}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 font-medium text-slate-700">キャンセル</Link><button type="button" disabled={busy || (subject === "b" && selected.length !== 4)} onClick={() => void start()} className="min-h-11 rounded-xl bg-blue-600 px-6 font-medium text-white disabled:bg-slate-300">模擬テストを始める</button></div>
    </section>
  );
}
