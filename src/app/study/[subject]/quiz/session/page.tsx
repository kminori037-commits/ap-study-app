import { notFound } from "next/navigation";
import { isSubjectKey } from "@/lib/subjects";
import { QuizSession } from "./quiz-session";

export function generateStaticParams() {
  return [{ subject: "a" }, { subject: "b" }];
}

export default async function QuizSessionPage({ params }: PageProps<"/study/[subject]/quiz/session">) {
  const { subject } = await params;
  if (!isSubjectKey(subject)) notFound();
  return <QuizSession subject={subject} />;
}
