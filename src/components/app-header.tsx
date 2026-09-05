"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "ホーム" },
  { href: "/history", label: "履歴" },
  { href: "/bookmarks", label: "ブックマーク" },
  { href: "/settings", label: "設定" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <Link className="flex min-h-11 items-center gap-3 font-semibold text-slate-900" href="/">
          <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-sm text-white">AP</span>
          <span>応用情報 学習室</span>
        </Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:ml-auto sm:w-auto" aria-label="メインメニュー">
          {navigation.map((item) => {
            const current = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} className={`flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-medium transition-colors ${current ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`} href={item.href} aria-current={current ? "page" : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button type="button" className="ml-auto grid size-11 place-items-center rounded-full border border-slate-200 bg-slate-50 text-sm font-medium sm:ml-0" aria-label="アカウントメニュー">み</button>
      </div>
    </header>
  );
}
