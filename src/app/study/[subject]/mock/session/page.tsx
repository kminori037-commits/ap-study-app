import { notFound } from "next/navigation";
import { isSubjectKey } from "@/lib/subjects";
import { MockSession } from "./mock-session";

export default async function MockSessionPage({ params }: PageProps<"/study/[subject]/mock/session">) {
  const { subject } = await params;
  if (!isSubjectKey(subject)) notFound();
  return <MockSession subject={subject} />;
}
