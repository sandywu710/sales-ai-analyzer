import { UploadForm } from "@/components/upload-form";
import { SiteNav } from "@/components/site-nav";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav showNew={false} />

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-5xl w-full mx-auto text-center mb-12 space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            AI 戰情分析系統 · Powered by Gemini
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            把電話錄音變成{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Demo 攻略
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            上傳邀約電話錄音或貼上逐字稿，AI 在 30 秒內產出客製化成交戰略報告
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            { icon: "📈", label: "信任度評分" },
            { icon: "🧠", label: "動機挖掘" },
            { icon: "🎯", label: "性格標籤" },
            { icon: "💬", label: "破冰話術" },
            { icon: "🔥", label: "成交子彈" },
            { icon: "🛡️", label: "反對預警" },
          ].map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 rounded-full bg-slate-800/60 border border-slate-700/50 px-4 py-1.5 text-sm text-slate-300"
            >
              <span>{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>

        {/* Upload card */}
        <div className="w-full max-w-2xl rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-5 sm:p-8 shadow-2xl shadow-black/40">
          <UploadForm />
        </div>
      </main>
    </div>
  );
}
