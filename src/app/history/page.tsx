"use client";

import { useEffect, useState } from "react";
import { SectionPage } from "@/components/section-page";
import { learningApi, type StudySession } from "@/lib/api-client";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" });

export default function HistoryPage() {
  const [items, setItems] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    learningApi.getHistory()
      .then((history) => { if (active) setItems(history); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "履歴を読み込めませんでした。");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <SectionPage kicker="過去30日・最大50回" title="学習履歴" description="各回の結果を科目A・科目Bに分けて表示します。累計正答率は表示しません。">
      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700" role="alert">{error}</p>}
      {loading ? (
        <p className="mt-8 text-slate-600" aria-live="polite">読み込んでいます…</p>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">まだ保存された学習履歴はありません。</div>
      ) : (
        <ul className="mt-8 grid gap-4">
          {items.map((item) => (
            <li key={item.sessionId} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950">科目{item.subject} ・ {item.mode === "MOCK" ? "模擬テスト" : "一問一答"}</p>
                <time className="text-sm text-slate-500" dateTime={item.createdAt}>{dateFormatter.format(new Date(item.createdAt))}</time>
              </div>
              <p className="mt-3 text-slate-700">正答率 <strong className="text-xl text-slate-950">{item.scoreRate}%</strong>（{item.correctCount} / {item.answeredCount}問）</p>
            </li>
          ))}
        </ul>
      )}
    </SectionPage>
  );
}
