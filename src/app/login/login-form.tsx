"use client";

import { confirmResetPassword, confirmSignIn, resetPassword, signIn } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { isAuthConfigured } from "@/lib/amplify-client";

type Step = "sign-in" | "new-password" | "reset-request" | "reset-confirm";

function errorMessage(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAuthorizedException" || name === "UserNotFoundException") return "メールアドレスまたはパスワードを確認してください。";
  if (name === "LimitExceededException" || name === "TooManyRequestsException") return "試行回数が上限に達しました。しばらく待ってからお試しください。";
  if (name === "CodeMismatchException") return "確認コードが正しくありません。";
  if (name === "ExpiredCodeException") return "確認コードの有効期限が切れています。もう一度送信してください。";
  if (name === "InvalidPasswordException") return "パスワード条件を満たしていません。";
  return "処理に失敗しました。時間をおいてもう一度お試しください。";
}

export function LoginForm() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [step, setStep] = useState<Step>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const completeLogin = async () => {
    await refreshAuth();
    router.replace("/");
  };

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn({ username: email.trim(), password });
      if (result.isSignedIn || result.nextStep.signInStep === "DONE") await completeLogin();
      else if (result.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") setStep("new-password");
      else setError("追加の認証操作が必要です。管理者へお問い合わせください。");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const handleNewPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 12) {
      setError("新しいパスワードは12文字以上で入力してください。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await confirmSignIn({ challengeResponse: newPassword });
      if (result.isSignedIn || result.nextStep.signInStep === "DONE") await completeLogin();
      else setError("パスワード変更後に追加の操作が必要です。管理者へお問い合わせください。");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await resetPassword({ username: email.trim() });
      setStep("reset-confirm");
      setNotice("確認コードを送信しました。メールをご確認ください。");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfirm = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await confirmResetPassword({ username: email.trim(), confirmationCode: confirmationCode.trim(), newPassword });
      setPassword("");
      setNewPassword("");
      setConfirmationCode("");
      setStep("sign-in");
      setNotice("パスワードを変更しました。新しいパスワードでログインしてください。");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthConfigured) return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800" role="alert">Cognitoの接続設定がありません。</div>;

  const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base";
  const buttonClass = "min-h-12 w-full rounded-xl bg-blue-600 px-5 font-medium text-white hover:bg-blue-700 disabled:bg-slate-300";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {notice && <p className="mb-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-800" role="status">{notice}</p>}
      {error && <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}

      {step === "sign-in" && (
        <form onSubmit={handleSignIn}>
          <label className="block font-medium" htmlFor="email">メールアドレス</label>
          <input className={inputClass} id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label className="mt-5 block font-medium" htmlFor="password">パスワード</label>
          <input className={inputClass} id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className={`${buttonClass} mt-7`} type="submit" disabled={loading}>{loading ? "ログイン中…" : "ログイン"}</button>
          <button type="button" onClick={() => { setStep("reset-request"); setError(""); setNotice(""); }} className="mt-4 min-h-11 w-full text-sm font-medium text-blue-600">パスワードを忘れた方</button>
        </form>
      )}

      {step === "new-password" && (
        <form onSubmit={handleNewPassword}>
          <h2 className="text-lg font-semibold">初回パスワード変更</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">12文字以上で、英大文字・英小文字・数字・記号をそれぞれ含めてください。</p>
          <label className="mt-5 block font-medium" htmlFor="new-password">新しいパスワード</label>
          <input className={inputClass} id="new-password" type="password" autoComplete="new-password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          <button className={`${buttonClass} mt-7`} type="submit" disabled={loading}>{loading ? "変更中…" : "変更してログイン"}</button>
        </form>
      )}

      {step === "reset-request" && (
        <form onSubmit={handleResetRequest}>
          <h2 className="text-lg font-semibold">パスワード再設定</h2>
          <p className="mt-2 text-sm text-slate-600">招待されたメールアドレスを入力してください。</p>
          <label className="mt-5 block font-medium" htmlFor="reset-email">メールアドレス</label>
          <input className={inputClass} id="reset-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <button className={`${buttonClass} mt-7`} type="submit" disabled={loading}>{loading ? "送信中…" : "確認コードを送る"}</button>
          <button type="button" onClick={() => setStep("sign-in")} className="mt-4 min-h-11 w-full text-sm font-medium text-slate-600">ログインへ戻る</button>
        </form>
      )}

      {step === "reset-confirm" && (
        <form onSubmit={handleResetConfirm}>
          <h2 className="text-lg font-semibold">確認コードを入力</h2>
          <label className="mt-5 block font-medium" htmlFor="code">確認コード</label>
          <input className={inputClass} id="code" inputMode="numeric" autoComplete="one-time-code" required value={confirmationCode} onChange={(event) => setConfirmationCode(event.target.value)} />
          <label className="mt-5 block font-medium" htmlFor="reset-new-password">新しいパスワード</label>
          <input className={inputClass} id="reset-new-password" type="password" autoComplete="new-password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          <button className={`${buttonClass} mt-7`} type="submit" disabled={loading}>{loading ? "変更中…" : "パスワードを変更"}</button>
        </form>
      )}
    </section>
  );
}
