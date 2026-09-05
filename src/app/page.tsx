import Link from "next/link";
import { subjects } from "@/lib/subjects";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="mb-2 font-medium text-blue-600">今日も一歩ずつ</p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">学習する試験を選んでください</h1>
      <p className="mt-3 text-slate-600">科目を選ぶと、一問一答または模擬テストへ進めます。</p>

      <div className="mt-9 grid gap-5 md:grid-cols-2">
        {Object.values(subjects).map((subject) => (
          <Link
            key={subject.key}
            href={`/study/${subject.key}`}
            className="group flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-7 transition hover:border-blue-400 hover:shadow-sm sm:p-8"
          >
            <span className={`grid size-14 place-items-center rounded-2xl text-2xl font-semibold ${subject.key === "a" ? "bg-blue-50 text-blue-600" : "bg-indigo-50 text-indigo-600"}`}>
              {subject.key.toUpperCase()}
            </span>
            <h2 className="mt-7 text-2xl font-semibold text-slate-950">{subject.label}</h2>
            <p className="mt-2 text-slate-600">{subject.description}</p>
            <span className="mt-auto pt-7 font-medium text-blue-600 group-hover:text-blue-700">学習方法を選ぶ →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
