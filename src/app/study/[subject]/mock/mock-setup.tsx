"use client";

import Link from "next/link";
import { useState } from "react";
import type { SubjectKey } from "@/lib/subjects";

const optionalBFields = ["サービスマネジメント", "プロジェクトマネジメント", "経営戦略", "システム監査", "データベース"];

export function MockSetup({ subject }: { subject: SubjectKey }) {
  const [selected, setSelected] = useState(optionalBFields.slice(0, 4));
  const toggle = (field: string) => setSelected((current) => current.includes(field) ? current.filter((item) => item !== field) : current.length < 4 ? [...current, field] : current);

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
      <dl className="grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
        <div><dt className="text-sm text-slate-500">問題数</dt><dd className="mt-1 text-xl font-semibold">{subject === "a" ? "80問" : "5問"}</dd></div>
        <div><dt className="text-sm text-slate-500">試験時間</dt><dd className="mt-1 text-xl font-semibold">150分</dd></div>
      </dl>
      {subject === "b" && (
        <fieldset className="mt-7">
          <legend className="font-semibold text-slate-950">回答する分野</legend>
          <p className="mt-2 text-sm text-slate-600">情報セキュリティは必須です。残り5分野から4分野を選択してください。</p>
          <label className="mt-4 flex min-h-12 items-center gap-3 rounded-xl border border-blue-300 bg-blue-50 p-4 font-medium text-blue-800"><input type="checkbox" checked disabled />情報セキュリティ（必須）</label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {optionalBFields.map((field) => (
              <label key={field} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-4 ${selected.includes(field) ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}>
                <input type="checkbox" checked={selected.includes(field)} onChange={() => toggle(field)} />{field}
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm font-medium text-slate-700">選択中: {selected.length} / 4分野</p>
        </fieldset>
      )}
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={`/study/${subject}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 font-medium text-slate-700">キャンセル</Link>
        <button type="button" disabled={subject === "b" && selected.length !== 4} className="min-h-11 rounded-xl bg-blue-600 px-6 font-medium text-white disabled:bg-slate-300">模擬テストを始める</button>
      </div>
      <p className="mt-4 text-sm text-slate-500">回答画面と自動保存は、認証・データ保存の実装と合わせて追加します。</p>
    </section>
  );
}
