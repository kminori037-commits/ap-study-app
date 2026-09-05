"use client";

import { useSearchParams } from "next/navigation";
import type { SubjectKey } from "@/lib/subjects";
import { SampleQuestion } from "./sample-question";

export function QuizSession({ subject }: { subject: SubjectKey }) {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "全分野";
  const filter = searchParams.get("filter") ?? "all";

  return <SampleQuestion subject={subject} category={category} filter={filter} />;
}
