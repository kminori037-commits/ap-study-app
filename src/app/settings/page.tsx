"use client";

import { deleteUser, fetchUserAttributes, signIn, signOut, updatePassword } from "aws-amplify/auth";
import { type FormEvent, useState } from "react";
import { SectionPage } from "@/components/section-page";
import { useAuth } from "@/components/auth-provider";
import { learningApi } from "@/lib/api-client";

type OpenPanel = "password" | "history" | "account" | null;

export default function SettingsPage() {
  const { refreshAuth, signOutCurrentUser } = useAuth();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);

  const open = (panel: Exclude<OpenPanel, null>) => {
    setOpenPanel(panel);
    setMessage("");
    setError("");
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword.length < 12) {
      setError("新しいパスワードは12文字以上にしてください。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("新しいパスワードと確認入力が一致しません。");
      return;
    }
    setBusy(true);
    try {
      await updatePassword({ oldPassword, newPassword });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOpenPanel(null);
      setMessage("パスワードを変更しました。管理者やアプリからパスワードを確認することはできません。");
    } catch {
      setError("パスワードを変更できませんでした。現在のパスワードと入力条件を確認してください。");
    } finally {
      setBusy(false);
    }
  };

  const resetHistory = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await learningApi.resetHistory();
      setOpenPanel(null);
      setMessage(`学習履歴をリセットしました（削除: ${result.deletedCount}件）。ブックマークは保持されています。`);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "履歴をリセットできませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const attributes = await fetchUserAttributes();
      if (!attributes.email) throw new Error("ログイン中のメールアドレスを確認できませんでした。");

      await signOut();
      const result = await signIn({ username: attributes.email, password: deletePassword });
      if (!result.isSignedIn) throw new Error("再認証を完了できませんでした。");

      await learningApi.deleteAccountData();
      await deleteUser();
      await signOutCurrentUser();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "アカウントを削除できませんでした。再度ログインしてお試しください。");
      await refreshAuth();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionPage kicker="アカウント管理" title="設定" description="パスワード、学習履歴、アカウントを本人が管理できます。">
      {message && <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-800" role="status">{message}</p>}
      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700" role="alert">{error}</p>}

      <div className="mt-8 grid gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">パスワード</h2>
          <p className="mt-2 text-slate-600">パスワードはCognitoだけが保護して管理し、管理者や本アプリから確認できません。</p>
          {openPanel !== "password" ? (
            <button type="button" onClick={() => open("password")} className="mt-4 min-h-11 rounded-xl border border-slate-300 px-5 font-medium text-slate-700">パスワードを変更</button>
          ) : (
            <form onSubmit={changePassword} className="mt-5 grid max-w-lg gap-4">
              <label className="grid gap-2 font-medium">現在のパスワード<input type="password" autoComplete="current-password" required value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-4 font-normal" /></label>
              <label className="grid gap-2 font-medium">新しいパスワード<input type="password" autoComplete="new-password" required minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-4 font-normal" /></label>
              <label className="grid gap-2 font-medium">新しいパスワード（確認）<input type="password" autoComplete="new-password" required minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 px-4 font-normal" /></label>
              <p className="text-sm text-slate-600">12文字以上で、英大文字・英小文字・数字・記号をそれぞれ含めてください。</p>
              <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-blue-600 px-5 font-medium text-white disabled:bg-slate-300">変更する</button><button type="button" disabled={busy} onClick={() => setOpenPanel(null)} className="min-h-11 rounded-xl border border-slate-300 px-5 font-medium">キャンセル</button></div>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">履歴をリセット</h2>
          <p className="mt-2 text-slate-600">過去の学習・模擬テスト履歴を削除します。ブックマークは保持されます。</p>
          {openPanel !== "history" ? (
            <button type="button" onClick={() => open("history")} className="mt-4 min-h-11 rounded-xl border border-slate-300 px-5 font-medium text-slate-700">履歴リセットへ進む</button>
          ) : (
            <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="font-medium text-amber-950">削除した履歴は元に戻せません。ブックマークは削除されません。</p>
              <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={resetHistory} className="min-h-11 rounded-xl bg-amber-700 px-5 font-medium text-white disabled:bg-slate-300">履歴を削除する</button><button type="button" disabled={busy} onClick={() => setOpenPanel(null)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-medium">キャンセル</button></div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-red-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-red-700">アカウント削除</h2>
          <p className="mt-2 text-slate-600">再認証後、アカウント、履歴、ブックマークをすべて削除します。この操作は元に戻せません。</p>
          {openPanel !== "account" ? (
            <button type="button" onClick={() => open("account")} className="mt-4 min-h-11 rounded-xl border border-red-300 px-5 font-medium text-red-700">アカウント削除へ進む</button>
          ) : (
            <form onSubmit={deleteAccount} className="mt-5 grid max-w-lg gap-4 rounded-xl border border-red-300 bg-red-50 p-5">
              <label className="grid gap-2 font-medium text-slate-950">本人確認のため現在のパスワードを入力<input type="password" autoComplete="current-password" required value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className="min-h-11 rounded-xl border border-red-300 bg-white px-4 font-normal" /></label>
              <label className="flex items-start gap-3 text-sm text-slate-800"><input type="checkbox" checked={deleteAcknowledged} onChange={(event) => setDeleteAcknowledged(event.target.checked)} className="mt-1" /><span>アカウントとすべての学習データが削除され、復元できないことを理解しました。</span></label>
              <label className="grid gap-2 font-medium text-slate-950">確認のため「アカウントを削除」と入力<input type="text" required value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} className="min-h-11 rounded-xl border border-red-300 bg-white px-4 font-normal" /></label>
              <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !deleteAcknowledged || deletePhrase !== "アカウントを削除" || !deletePassword} className="min-h-11 rounded-xl bg-red-700 px-5 font-medium text-white disabled:bg-slate-300">完全に削除する</button><button type="button" disabled={busy} onClick={() => setOpenPanel(null)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-medium">キャンセル</button></div>
            </form>
          )}
        </section>
      </div>
    </SectionPage>
  );
}
