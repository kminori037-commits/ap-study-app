import { notFound } from "next/navigation";
import { isSubjectKey } from "@/lib/subjects";
import { SampleQuestion } from "./sample-question";

export default async function QuizSessionPage({ params }: PageProps<"/study/[subject]/quiz/session">) {
  const { subject } = await params;
  if (!isSubjectKey(subject)) notFound();
  return <SampleQuestion subject={subject} />;
}
