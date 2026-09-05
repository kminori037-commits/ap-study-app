import Link from "next/link";
import { notFound } from "next/navigation";
import { isSubjectKey, subjects } from "@/lib/subjects";

export default async function ModeSelectionPage({ params }: PageProps<"/study/[subject]">) {
  const { subject: subjectParam } = await params;
  if (!isSubjectKey(subjectParam)) notFound();
  const subject = subjects[subjectParam];

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href="/" className="inline-flex min-h-11 items-center font-medium text-blue-600">← 科目選択へ戻る</Link>
      <p className="mt-5 font-medium text-blue-600">{subject.label}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">学習方法を選んでください</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Link href={`/study/${subject.key}/quiz`} className="rounded-3xl border border-slate-200 bg-white p-7 transition hover:border-blue-400 hover:shadow-sm">
          <span className="text-sm font-medium text-blue-600">自分のペースで</span>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">一問一答</h2>
          <p className="mt-3 leading-7 text-slate-600">{subject.quizDescription}</p>
          <span className="mt-8 inline-block font-medium text-blue-600">出題条件を選ぶ →</span>
        </Link>
        <Link href={`/study/${subject.key}/mock`} className="rounded-3xl border border-slate-200 bg-white p-7 transition hover:border-blue-400 hover:shadow-sm">
          <span className="text-sm font-medium text-indigo-600">本番形式で</span>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">模擬テスト</h2>
          <p className="mt-3 leading-7 text-slate-600">{subject.mockDescription}</p>
          <span className="mt-8 inline-block font-medium text-blue-600">試験条件を確認する →</span>
        </Link>
      </div>
    </main>
  );
}
