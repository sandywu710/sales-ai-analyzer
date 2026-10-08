import Link from "next/link";
import { ZapIcon, LayoutDashboardIcon, BarChart3Icon, UsersIcon, SlidersHorizontalIcon, InfoIcon, PlusIcon } from "lucide-react";

// 全站共用上方選單
const LINKS = [
  { href: "/dashboard", label: "紀錄", icon: LayoutDashboardIcon },
  { href: "/stats", label: "統計", icon: BarChart3Icon },
  { href: "/settings/consultants", label: "顧問", icon: UsersIcon },
  { href: "/settings/rubrics", label: "評分標準", icon: SlidersHorizontalIcon },
  { href: "/about", label: "關於", icon: InfoIcon },
];

export function SiteNav({ active, showNew = true }: { active?: string; showNew?: boolean }) {
  return (
    <nav className="border-b border-slate-800/60 px-4 sm:px-6 py-3 sticky top-0 z-20 bg-[#050d1a]/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <ZapIcon className="h-5 w-5 text-amber-400" />
          <span className="font-bold tracking-tight text-white">Sales AI Analyzer</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg transition-colors ${
                active === href ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          {showNew && (
            <Link href="/" className="flex items-center gap-1.5 text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors">
              <PlusIcon className="h-4 w-4" />
              新增分析
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
