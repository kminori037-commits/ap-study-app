import { notFound } from "next/navigation";
import { isSubjectKey } from "@/lib/subjects";
import { SampleQuestion } from "./sample-question";

export default async function QuizSessionPage({ params, searchParams }: PageProps<"/study/[subject]/quiz/session">) {
  const { subject } = await params;
  const query = await searchParams;
  if (!isSubjectKey(subject)) notFound();
  const category = typeof query.category === "string" ? query.category : "全分野";
  const filter = typeof query.filter === "string" ? query.filter : "all";
  return <SampleQuestion subject={subject} category={category} filter={filter} />;
}
