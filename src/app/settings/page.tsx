import { SectionPage } from "@/components/section-page";

export default function SettingsPage() {
  return (
    <SectionPage kicker="アカウント管理" title="設定" description="認証接続後に、パスワード変更、履歴リセット、アカウント削除を利用できます。">
      <div className="mt-8 grid gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold">パスワード</h2><p className="mt-2 text-slate-600">パスワードはCognitoで管理し、管理者からも確認できません。</p><button type="button" disabled className="mt-4 min-h-11 rounded-xl border border-slate-300 px-5 text-slate-500">認証接続後に利用可能</button></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold">履歴をリセット</h2><p className="mt-2 text-slate-600">学習履歴を削除しても、ブックマークは保持します。</p><button type="button" disabled className="mt-4 min-h-11 rounded-xl border border-slate-300 px-5 text-slate-500">認証接続後に利用可能</button></section>
        <section className="rounded-2xl border border-red-200 bg-white p-6"><h2 className="text-lg font-semibold text-red-700">アカウント削除</h2><p className="mt-2 text-slate-600">再認証と二重確認後に、本人がアカウントと学習データを削除できます。</p><button type="button" disabled className="mt-4 min-h-11 rounded-xl border border-red-200 px-5 text-red-400">認証接続後に利用可能</button></section>
      </div>
    </SectionPage>
  );
}
