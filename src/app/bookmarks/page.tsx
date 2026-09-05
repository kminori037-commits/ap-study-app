"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionPage } from "@/components/section-page";
import { learningApi, type Bookmark } from "@/lib/api-client";

export default function BookmarksPage() {
  const [items, setItems] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    let active = true;
    learningApi.getBookmarks()
      .then((bookmarks) => { if (active) setItems(bookmarks); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "ブックマークを読み込めませんでした。");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const remove = async (questionId: string) => {
    setDeletingId(questionId);
    setError("");
    try {
      await learningApi.deleteBookmark(questionId);
      setItems((current) => current.filter((item) => item.questionId !== questionId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ブックマークを削除できませんでした。");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <SectionPage kicker="あとで復習" title="ブックマーク" description="保存した科目A・科目Bの問題をここから復習できます。">
      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700" role="alert">{error}</p>}
      {loading ? (
        <p className="mt-8 text-slate-600" aria-live="polite">読み込んでいます…</p>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">まだブックマークした問題はありません。</div>
      ) : (
        <ul className="mt-8 grid gap-4">
          {items.map((item) => (
            <li key={item.questionId} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">科目{item.subject} ・ {item.category || "分野未設定"}</p>
                <p className="mt-1 font-semibold text-slate-950">問題ID: {item.questionId}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/study/${item.subject.toLowerCase()}/quiz/session`} className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 font-medium text-white">復習する</Link>
                <button type="button" disabled={deletingId === item.questionId} onClick={() => remove(item.questionId)} className="min-h-11 rounded-xl border border-slate-300 px-4 font-medium text-slate-700 disabled:text-slate-400">削除</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionPage>
  );
}
