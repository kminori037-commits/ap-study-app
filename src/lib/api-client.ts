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
