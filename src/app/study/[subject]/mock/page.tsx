import Link from "next/link";
import { notFound } from "next/navigation";
import { isSubjectKey, subjects } from "@/lib/subjects";
import { MockSetup } from "./mock-setup";

export default async function MockSetupPage({ params }: PageProps<"/study/[subject]/mock">) {
  const { subject: subjectParam } = await params;
  if (!isSubjectKey(subjectParam)) notFound();
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link href={`/study/${subjectParam}`} className="inline-flex min-h-11 items-center font-medium text-blue-600">← モード選択へ戻る</Link>
      <p className="mt-5 font-medium text-indigo-600">{subjects[subjectParam].label}・模擬テスト</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">試験条件を確認する</h1>
      <MockSetup subject={subjectParam} />
    </main>
  );
}
