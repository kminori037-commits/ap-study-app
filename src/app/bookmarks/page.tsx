import { SectionPage } from "@/components/section-page";

export default function BookmarksPage() {
  return (
    <SectionPage kicker="あとで復習" title="ブックマーク" description="保存した科目A・科目Bの問題をここから復習できます。">
      <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">まだブックマークした問題はありません。</div>
    </SectionPage>
  );
}
