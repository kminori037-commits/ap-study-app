import { fetchAuthSession } from "aws-amplify/auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export type Bookmark = {
  questionId: string;
  subject: "A" | "B";
  category: string;
  createdAt: string;
};

export type StudySession = {
  sessionId: string;
  subject: "A" | "B";
  mode: "QUIZ" | "MOCK";
  answeredCount: number;
  correctCount: number;
  scoreRate: number;
  durationSeconds: number;
  createdAt: string;
};

export type Question = {
  questionId: string;
  subject: "A" | "B";
  group: string;
  category: string;
  prompt: string;
  choices?: string[];
  answerKind: "CHOICE" | "SHORT";
  source: { label: string; url?: string };
};

export type GradeResult = {
  correct: boolean;
  correctIndex?: number;
  modelAnswer: string;
  explanation: string;
  source: { label: string; url?: string };
};

export type MockActive = {
  subject: "A" | "B";
  questions: Question[];
  answers: Record<string, number | string>;
  remainingSeconds: number;
  startedAt: string;
  updatedAt: string;
  selectedCategories: string[];
  configuredQuestionCount: number;
};

export type MockQuestionResult = GradeResult & {
  questionId: string;
  userAnswer: number | string | null;
  question: Question | null;
};

export type MockSubmission = {
  session: StudySession;
  results: MockQuestionResult[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiUrl) throw new Error("API URLが設定されていません。");
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error("ログイン情報を確認できませんでした。再度ログインしてください。");

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok) throw new Error(data?.message ?? "サーバーとの通信に失敗しました。");
  return data as T;
}

export const learningApi = {
  async getQuestions(subject: "A" | "B", category: string, filter: string) {
    const query = new URLSearchParams({ subject, category, filter });
    return (await request<{ items: Question[] }>(`/questions?${query.toString()}`)).items;
  },
  async gradeQuestion(questionId: string, subject: "A" | "B", answer: number | string) {
    return request<GradeResult>(`/questions/${encodeURIComponent(questionId)}/grade`, {
      method: "POST",
      body: JSON.stringify({ subject, answer }),
    });
  },
  async getActiveMock(subject: "A" | "B") {
    return (await request<{ active: MockActive | null }>(`/mock/${subject}/active`)).active;
  },
  async startMock(subject: "A" | "B", selectedCategories: string[]) {
    return (await request<{ active: MockActive }>(`/mock/${subject}/start`, {
      method: "POST",
      body: JSON.stringify({ selectedCategories }),
    })).active;
  },
  async saveActiveMock(subject: "A" | "B", answers: Record<string, number | string>, remainingSeconds: number) {
    return request<{ saved: boolean; updatedAt: string }>(`/mock/${subject}/active`, {
      method: "PUT",
      body: JSON.stringify({ answers, remainingSeconds }),
    });
  },
  async discardActiveMock(subject: "A" | "B") {
    await request<void>(`/mock/${subject}/active`, { method: "DELETE" });
  },
  async submitMock(subject: "A" | "B") {
    return request<MockSubmission>(`/mock/${subject}/submit`, { method: "POST" });
  },
  async getBookmarks() {
    return (await request<{ items: Bookmark[] }>("/bookmarks")).items;
  },
  async saveBookmark(questionId: string, input: Pick<Bookmark, "subject" | "category">) {
    return (await request<{ item: Bookmark }>(`/bookmarks/${encodeURIComponent(questionId)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    })).item;
  },
  async deleteBookmark(questionId: string) {
    await request<void>(`/bookmarks/${encodeURIComponent(questionId)}`, { method: "DELETE" });
  },
  async getHistory() {
    return (await request<{ items: StudySession[] }>("/history")).items;
  },
  async resetHistory() {
    return request<{ deletedCount: number }>("/history", { method: "DELETE" });
  },
  async deleteAccountData() {
    return request<{ deletedCount: number }>("/account-data", { method: "DELETE" });
  },
  async saveSession(input: Omit<StudySession, "sessionId" | "scoreRate" | "createdAt">) {
    return (await request<{ item: StudySession }>("/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    })).item;
  },
};
