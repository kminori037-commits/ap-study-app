import { SectionPage } from "@/components/section-page";

export default function HistoryPage() {
  return (
    <SectionPage kicker="過去30日・最大50回" title="学習履歴" description="各回の結果を科目A・科目Bに分けて表示します。累計正答率は表示しません。">
      <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">まだ保存された学習履歴はありません。</div>
    </SectionPage>
  );
}
