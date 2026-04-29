import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase";
import { ObjectionSimulator } from "@/components/objection-simulator";
import {
  ArrowLeftIcon, ZapIcon, BrainIcon, TargetIcon,
  MessageSquareIcon, ShieldIcon, StarIcon,
} from "lucide-react";

interface AnalysisRow {
  tags: string[];
  motivation: string;
  personality: string;
  opening_script: string;
  selling_points: string[];
  objections: { issue: string; response: string }[];
}

interface RecordingRow {
  id: string;
  created_at: string;
  transcript: string | null;
  status: string;
}

// Map tags to emoji + color class
const TAG_META: Record<string, { emoji: string; cls: string }> = {
  高潛力:     { emoji: "🔥", cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  價格敏感:   { emoji: "⚠️", cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
  視覺導向:   { emoji: "🎨", cls: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  決策者:     { emoji: "👑", cls: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  時間壓力:   { emoji: "⏰", cls: "bg-red-500/20 text-red-300 border-red-500/40" },
  數位遊牧:   { emoji: "🌍", cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
  副業需求:   { emoji: "💼", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  default:    { emoji: "🏷️", cls: "bg-slate-700/50 text-slate-300 border-slate-600/50" },
};

function getTagMeta(tag: string) {
  return TAG_META[tag] ?? TAG_META.default;
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

export default async function RecordingPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();

  const [recResult, anaResult] = await Promise.all([
    supabase.from("recordings").select("*").eq("id", params.id).single(),
    supabase.from("analysis").select("*").eq("recording_id", params.id).single(),
  ]);
  const rec = recResult.data as RecordingRow | null;
  const ana = anaResult.data as AnalysisRow | null;

  if (!rec) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-800/60 px-6 py-4 sticky top-0 z-10 bg-[#050d1a]/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
              <ArrowLeftIcon className="h-4 w-4" />
              返回
            </Link>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <ZapIcon className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium">戰情報告</span>
            </div>
          </div>
          <span className="text-xs text-slate-600">
            {new Date(rec.created_at).toLocaleString("zh-TW")}
          </span>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        {/* ── Top: Tags ── */}
        {ana?.tags && ana.tags.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-widest">快速標籤</p>
            <div className="flex flex-wrap gap-2">
              {ana.tags.map((tag) => {
                const m = getTagMeta(tag);
                return (
                  <span key={tag} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border font-medium ${m.cls}`}>
                    <span>{m.emoji}</span> {tag}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Middle: Two columns ── */}
        {ana ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Pain points + Motivation + Personality */}
            <div className="space-y-4">
              <Section icon={<BrainIcon className="h-4 w-4 text-cyan-400" />} title="客戶痛點與動機">
                <div className="space-y-3">
                  <div className="rounded-lg bg-slate-800/50 border border-slate-700/40 p-4">
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">核心動機</p>
                    <p className="text-sm text-slate-200 leading-relaxed">{ana.motivation}</p>
                  </div>
                  <div className="rounded-lg bg-slate-800/50 border border-slate-700/40 p-4">
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">性格標籤</p>
                    <p className="text-sm text-amber-300 font-medium">{ana.personality}</p>
                  </div>
                </div>
              </Section>

              {/* Selling points */}
              <Section icon={<StarIcon className="h-4 w-4 text-amber-400" />} title="成交子彈 · 3 個亮點">
                <div className="space-y-2">
                  {(ana.selling_points ?? []).map((point, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg bg-slate-800/50 border border-slate-700/40 px-4 py-3">
                      <span className="text-amber-400 font-bold text-sm mt-0.5">0{i + 1}</span>
                      <p className="text-sm text-slate-200 leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            {/* Right: Demo strategy */}
            <div className="space-y-4">
              <Section icon={<TargetIcon className="h-4 w-4 text-emerald-400" />} title="Demo 攻略卡片">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                  <p className="text-xs text-emerald-500 uppercase tracking-wide">建議重點順序</p>
                  <ol className="space-y-2">
                    {[
                      "先用動機共鳴打開情感連結",
                      `強調「${(ana.selling_points ?? [])[0] ?? "核心賣點"}」`,
                      "展示具體案例或數據佐證",
                      "引導對方說出自己的期待",
                      "提供限時優惠或行動方案",
                    ].map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-emerald-400 font-bold shrink-0">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </Section>

              <Section icon={<MessageSquareIcon className="h-4 w-4 text-purple-400" />} title="客製化開場白">
                <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-purple-400 text-lg mt-0.5">"</span>
                    <p className="text-sm text-slate-200 leading-relaxed italic">{ana.opening_script}</p>
                    <span className="text-purple-400 text-lg self-end">"</span>
                  </div>
                </div>
              </Section>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-12 text-center text-slate-500">
            分析尚未完成或發生錯誤
          </div>
        )}

        {/* ── Bottom: Objection simulator ── */}
        {ana?.objections && ana.objections.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldIcon className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-semibold text-slate-300">反對預警 · 點擊預演應對</h2>
              <span className="text-xs text-slate-600">{ana.objections.length} 個預測反對</span>
            </div>
            <ObjectionSimulator objections={ana.objections} />
          </div>
        )}

        {/* Transcript (collapsed) */}
        {rec.transcript && (
          <details className="group rounded-xl border border-slate-800 bg-slate-900/40">
            <summary className="px-5 py-4 text-sm text-slate-500 cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center justify-between">
              <span>查看原始逐字稿</span>
              <span className="text-xs">點擊展開 ▾</span>
            </summary>
            <div className="px-5 pb-5 pt-2 border-t border-slate-800">
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{rec.transcript}</p>
            </div>
          </details>
        )}
      </main>
    </div>
  );
}
