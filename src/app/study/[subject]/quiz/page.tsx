import Link from "next/link";
import { notFound } from "next/navigation";
import { isSubjectKey, subjects } from "@/lib/subjects";
import { QuizSetup } from "./quiz-setup";

export default async function QuizSetupPage({ params }: PageProps<"/study/[subject]/quiz">) {
  const { subject: subjectParam } = await params;
  if (!isSubjectKey(subjectParam)) notFound();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href={`/study/${subjectParam}`} className="inline-flex min-h-11 items-center font-medium text-blue-600">← モード選択へ戻る</Link>
      <p className="mt-5 font-medium text-blue-600">{subjects[subjectParam].label}・一問一答</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">出題内容を選ぶ</h1>
      <p className="mt-3 text-slate-600">分野と復習条件を組み合わせて開始します。</p>
      <QuizSetup subject={subjectParam} />
    </main>
  );
}
