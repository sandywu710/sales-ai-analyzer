export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import { ZapIcon, LayoutDashboardIcon, PlusIcon, ClockIcon, UserIcon } from "lucide-react";
import { DeleteRecording } from "@/components/delete-recording";

interface AnalysisRow {
  tags: string[];
  personality: string;
}

interface RecordingRow {
  id: string;
  created_at: string;
  status: string;
  transcript: string | null;
  name: string | null;
  analysis: AnalysisRow[] | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

const tagColors: Record<string, string> = {
  高潛力: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  價格敏感: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  視覺導向: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  決策者: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  default: "bg-slate-700/50 text-slate-300 border-slate-600/50",
};

function tagClass(tag: string) {
  return tagColors[tag] ?? tagColors.default;
}

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  // Try with name column; fall back without it if migration hasn't run yet
  let { data: recordings, error: queryError } = await supabase
    .from("recordings")
    .select("id, created_at, status, transcript, name, analysis(tags, personality)")
    .order("created_at", { ascending: false }) as { data: RecordingRow[] | null; error: unknown };

  if (queryError || !recordings) {
    const fallback = await supabase
      .from("recordings")
      .select("id, created_at, status, transcript, analysis(tags, personality)")
      .order("created_at", { ascending: false }) as { data: RecordingRow[] | null };
    recordings = fallback.data;
  }

  const rows = recordings ?? [];
  const done = rows.filter((r) => r.status === "done").length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-800/60 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ZapIcon className="h-5 w-5 text-amber-400" />
            <span className="font-bold tracking-tight">Sales AI Analyzer</span>
          </div>
          <Link href="/" className="flex items-center gap-2 text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors">
            <PlusIcon className="h-4 w-4" />
            新增分析
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <LayoutDashboardIcon className="h-5 w-5 text-amber-400" />
          <h1 className="text-xl font-bold">分析紀錄</h1>
          <span className="ml-2 rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-xs text-slate-400">
            {rows.length} 筆
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "總紀錄", value: rows.length, color: "text-white" },
            { label: "已完成", value: done, color: "text-emerald-400" },
            { label: "處理中", value: rows.length - done, color: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
              <p className="text-slate-500 text-xs mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* List */}
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-16 text-center">
            <p className="text-slate-500 text-sm">尚無分析紀錄</p>
            <Link href="/" className="mt-4 inline-block text-amber-400 text-sm hover:underline">
              上傳第一筆錄音 →
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((r) => {
              const analysis = r.analysis?.[0];
              const tags: string[] = analysis?.tags ?? [];
              const hasName = r.name && r.name.trim();
              const displayName = hasName ? r.name!.trim() : "未知";

              return (
                <div
                  key={r.id}
                  className="group relative rounded-xl border border-slate-700/60 bg-slate-900/60 hover:border-amber-500/40 hover:bg-slate-800/60 transition-all duration-200"
                >
                  {/* Clickable main area */}
                  <Link href={`/recording/${r.id}`} className="block p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0 space-y-2.5">
                        {/* Name — primary identifier */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="h-4 w-4 text-amber-400 shrink-0" />
                            <span className={`text-base font-bold ${hasName ? "text-white" : "text-slate-500 italic"}`}>
                              {displayName}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            r.status === "done"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : r.status === "processing"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-slate-700/50 text-slate-400 border-slate-600/40"
                          }`}>
                            {r.status === "done" ? "✓ 完成" : r.status === "processing" ? "⏳ 處理中" : "待處理"}
                          </span>
                        </div>

                        {/* Date — secondary */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <ClockIcon className="h-3 w-3" />
                          {formatDate(r.created_at)}
                        </div>

                        {/* Tags */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => (
                              <span key={tag} className={`text-xs px-2.5 py-0.5 rounded-full border ${tagClass(tag)}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Personality */}
                        {analysis?.personality && (
                          <p className="text-sm text-slate-400">
                            <span className="text-slate-500">性格：</span>
                            {analysis.personality}
                          </p>
                        )}
                      </div>

                      <span className="text-slate-600 group-hover:text-amber-400 transition-colors text-lg shrink-0 mr-8">→</span>
                    </div>
                  </Link>

                  {/* Delete button — outside Link to avoid navigation */}
                  <div className="absolute top-3.5 right-3.5">
                    <DeleteRecording recordingId={r.id} redirectAfter={false} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
