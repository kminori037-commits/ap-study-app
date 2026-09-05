"use client";

import Link from "next/link";
import { useState } from "react";
import type { SubjectKey } from "@/lib/subjects";

const fields = {
  a: ["全分野", "テクノロジ", "マネジメント", "ストラテジ", "データベース", "セキュリティ"],
  b: ["全分野", "情報セキュリティ", "サービスマネジメント", "プロジェクトマネジメント", "経営戦略", "システム監査", "データベース"],
};
const filters = ["すべて", "未回答", "前回不正解", "ブックマーク"];
const filterCodes: Record<string, string> = {
  "すべて": "all",
  "未回答": "unanswered",
  "前回不正解": "incorrect",
  "ブックマーク": "bookmarked",
};

export function QuizSetup({ subject }: { subject: SubjectKey }) {
  const [field, setField] = useState(fields[subject][0]);
  const [filter, setFilter] = useState(filters[0]);

  return (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
      <fieldset>
        <legend className="font-semibold text-slate-950">出題分野</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {fields[subject].map((item) => (
            <label key={item} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm ${field === item ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700"}`}>
              <input type="radio" name="field" value={item} checked={field === item} onChange={() => setField(item)} />
              {item}
            </label>
          ))}
        </div>
      </fieldset>
      <hr className="my-7 border-slate-200" />
      <fieldset>
        <legend className="font-semibold text-slate-950">問題の絞り込み</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((item) => (
            <label key={item} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm ${filter === item ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700"}`}>
              <input type="radio" name="filter" value={item} checked={filter === item} onChange={() => setFilter(item)} />
              {item}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={`/study/${subject}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 font-medium text-slate-700">キャンセル</Link>
        <Link href={`/study/${subject}/quiz/session?category=${encodeURIComponent(field)}&filter=${filterCodes[filter]}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 font-medium text-white hover:bg-blue-700">一問一答を始める</Link>
      </div>
    </div>
  );
}
