"use client";

import Link from "next/link";
import { useState } from "react";
import type { SubjectKey } from "@/lib/subjects";

const sample = {
  a: {
    category: "セキュリティ",
    prompt: "公開鍵暗号方式を利用したディジタル署名で、送信者が行う操作として適切なものはどれか。",
    choices: ["受信者の公開鍵で暗号化する", "受信者の秘密鍵で暗号化する", "送信者の秘密鍵で署名を生成する", "送信者の公開鍵で署名を生成する"],
    correct: 2,
  },
  b: {
    category: "情報セキュリティ",
    prompt: "インシデント発生時に、証拠保全の観点から最初に記録すべき事項を簡潔に答えよ。",
    choices: [],
    correct: 0,
  },
};

export function SampleQuestion({ subject }: { subject: SubjectKey }) {
  const question = sample[subject];
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [answered, setAnswered] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const canAnswer = subject === "a" ? selected !== null : textAnswer.trim().length > 0;
  const correct = subject === "a" && selected === question.correct;

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>科目{subject.toUpperCase()} ・ {question.category}</span>
        <button type="button" aria-pressed={bookmarked} onClick={() => setBookmarked((value) => !value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 font-medium text-slate-700">{bookmarked ? "★ 保存済み" : "☆ ブックマーク"}</button>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 text-sm"><strong>問題 1 / 最大100問</strong><span className="text-slate-500">いつでも終了できます</span></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="学習進捗" aria-valuenow={1} aria-valuemin={0} aria-valuemax={100}><span className="block h-full w-[1%] bg-blue-600" /></div>
      <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
        <h1 className="text-xl font-semibold leading-9 text-slate-950 sm:text-2xl">{question.prompt}</h1>
        {subject === "a" ? (
          <fieldset className="mt-6 grid gap-3" disabled={answered}>
            <legend className="sr-only">解答選択肢</legend>
            {question.choices.map((choice, index) => (
              <label key={choice} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 ${selected === index ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
                <input type="radio" name="answer" checked={selected === index} onChange={() => setSelected(index)} />
                <span>{["ア", "イ", "ウ", "エ"][index]}　{choice}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <div className="mt-6"><label htmlFor="written-answer" className="font-medium">あなたの回答</label><textarea id="written-answer" value={textAnswer} disabled={answered} onChange={(event) => setTextAnswer(event.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-4 text-base" /></div>
        )}
        {answered && (
          <div className={`mt-6 rounded-2xl border p-5 ${correct ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`} role="status">
            <h2 className="font-semibold text-slate-950">{subject === "a" ? (correct ? "○ 正解です" : "× 不正解です") : "自己採点は模範解答と採点基準を使います"}</h2>
            <p className="mt-2 leading-7 text-slate-700">これは画面動作確認用のサンプル問題です。正式な解説とIPA出典は、問題データ実装時に登録します。</p>
          </div>
        )}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link href={`/study/${subject}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 font-medium text-slate-700">学習を終了</Link>
          <button type="button" disabled={!canAnswer || answered} onClick={() => setAnswered(true)} className="min-h-11 rounded-xl bg-blue-600 px-6 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300">回答する</button>
        </div>
      </section>
    </main>
  );
}
