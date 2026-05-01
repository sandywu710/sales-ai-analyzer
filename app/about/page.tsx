import Link from "next/link";
import { ZapIcon, ArrowLeftIcon, InfoIcon } from "lucide-react";
import { WelcomeContent } from "@/components/welcome-dialog";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-slate-800/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <ZapIcon className="h-5 w-5 text-amber-400" />
              <span className="font-bold tracking-tight text-white">Sales AI Analyzer</span>
            </Link>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            回首頁
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg space-y-3">
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-6">
            <InfoIcon className="h-4 w-4" />
            關於這個工具
          </div>
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-8 shadow-xl shadow-black/30">
            <WelcomeContent />
          </div>
        </div>
      </main>
    </div>
  );
}
