import type { TrustResult, Evidence } from "@/lib/trust";
import { CLASSIFICATION_FIELDS } from "@/lib/taxonomy";
import { IDEAL_DURATION } from "@/lib/trust-prompt";
import { StudentInfoCard } from "@/components/student-info-card";
import { formatDuration, parseTimestamp } from "@/lib/audio";
import {
  GaugeIcon, ClockIcon, AlertTriangleIcon, TrendingUpIcon, TrendingDownIcon,
  LightbulbIcon, CheckCircle2Icon, CircleDashedIcon, XCircleIcon, AnchorIcon, TagsIcon, MessageCircleIcon,
} from "lucide-react";

const LEVEL_STYLE: Record<number, string> = {
  0: "text-red-300 bg-red-500/15 border-red-500/40",
  1: "text-amber-300 bg-amber-500/15 border-amber-500/40",
  2: "text-sky-300 bg-sky-500/15 border-sky-500/40",
  3: "text-emerald-300 bg-emerald-500/15 border-emerald-500/40",
};

const STATUS_META = {
  有: { icon: CheckCircle2Icon, cls: "text-emerald-400", dot: "bg-emerald-400" },
  部分: { icon: CircleDashedIcon, cls: "text-amber-400", dot: "bg-amber-400" },
  沒有: { icon: XCircleIcon, cls: "text-red-400", dot: "bg-red-400" },
} as const;

function Card({ icon, title, children, right }: { icon: React.ReactNode; title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">{icon}{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Time({ t }: { t: string }) {
  return <span className="font-mono text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded px-1.5 py-0.5 shrink-0">{t || "—"}</span>;
}

function EvidenceList({ items }: { items: Evidence[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((e, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
          <Time t={e.time} />
          <span>{e.reason}</span>
        </li>
      ))}
    </ul>
  );
}

export function TrustReport({
  result, rubricName, levelIndex, createdAt,
}: {
  result: TrustResult;
  rubricName: string;
  levelIndex: number;
  createdAt: string;
}) {
  const d = result.call_duration_seconds;
  const durationWarn = d != null && (d < IDEAL_DURATION.min || d > IDEAL_DURATION.max);
  const total = d ?? Math.max(...result.stages.map((s) => parseTimestamp(s.start) ?? 0), 1) * 1.1;
  const curve = [
    { label: "前段", ...result.trust_curve.early },
    { label: "中段", ...result.trust_curve.middle },
    { label: "後段", ...result.trust_curve.late },
  ];
  const ratioTotal = result.softener.count + result.interrogation.count;

  return (
    <div className="space-y-4">
      {/* ── 學生資訊（可複製） ── */}
      <StudentInfoCard info={result.student_info} />

      {/* ── 總分 ── */}
      <div className="rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-slate-900/60 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-end gap-2">
            <span className="text-5xl font-bold text-white leading-none">{result.total_score}</span>
            <span className="text-slate-500 text-lg mb-1">/ {result.max_total}</span>
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${LEVEL_STYLE[Math.min(levelIndex, 3)]}`}>
                {result.trust_level}
              </span>
              <span className="text-xs text-slate-400 bg-slate-800/80 border border-slate-700 rounded-full px-2.5 py-1">
                評分標準：{rubricName}
              </span>
              <span className="text-xs text-slate-500">
                {result.source === "audio" ? "🎧 依音檔分析" : "📄 依逐字稿分析（無音檔）"} · {new Date(createdAt).toLocaleString("zh-TW")}
              </span>
            </div>
            <div className={`flex items-center gap-2 text-sm ${durationWarn ? "text-amber-300" : "text-slate-400"}`}>
              <ClockIcon className="h-4 w-4" />
              通話長度 {formatDuration(d)}
              {durationWarn && (
                <span className="flex items-center gap-1 text-xs bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
                  <AlertTriangleIcon className="h-3 w-3" />
                  {d! < IDEAL_DURATION.min ? "低於 8 分鐘" : "超過 12 分鐘"}，建議 8–12 分鐘
                </span>
              )}
            </div>
          </div>
        </div>
        {result.coach_tip && (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <LightbulbIcon className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs text-amber-400 mb-1">教練建議：下一通最該改的一件事</p>
              <p className="text-sm text-amber-100 leading-relaxed">{result.coach_tip}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── 各面向評分 ── */}
        <Card icon={<GaugeIcon className="h-4 w-4 text-sky-400" />} title="各面向評分">
          <div className="space-y-5">
            {result.dimensions.map((dim) => {
              const pct = dim.max_score ? (dim.score / dim.max_score) * 100 : 0;
              return (
                <div key={dim.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">{dim.name}</span>
                      <span className="text-[10px] text-slate-500 border border-slate-700 rounded px-1.5 py-0.5">{dim.basis}</span>
                    </div>
                    <span className="text-sm font-semibold text-white shrink-0">{dim.score}<span className="text-slate-500 font-normal"> / {dim.max_score}</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-sky-400" style={{ width: `${pct}%` }} />
                  </div>
                  {dim.summary && <p className="text-xs text-slate-300 leading-relaxed">{dim.summary}</p>}
                  <EvidenceList items={dim.evidence} />
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4">
          {/* ── 四階段時間軸 ── */}
          <Card icon={<ClockIcon className="h-4 w-4 text-emerald-400" />} title="四階段時間軸">
            <div className="relative h-8 rounded-lg bg-slate-800/80 border border-slate-700/60">
              {result.stages.map((s, i) => {
                const t = parseTimestamp(s.start);
                if (t == null) return null;
                const left = Math.min(100, (t / total) * 100);
                const meta = STATUS_META[s.status];
                return (
                  <div key={s.key} className="absolute top-0 bottom-0 flex items-center" style={{ left: `${left}%` }} title={`${s.name}：${s.start}（${s.status}）`}>
                    <div className={`w-0.5 h-full ${meta.dot}`} />
                    <span className={`absolute -top-0.5 left-1 text-[10px] font-bold ${meta.cls}`}>{i + 1}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-600 -mt-2">
              <span>0:00</span><span>{formatDuration(total)}</span>
            </div>
            <ol className="space-y-2.5">
              {result.stages.map((s, i) => {
                const meta = STATUS_META[s.status];
                const Icon = meta.icon;
                return (
                  <li key={s.key} className="flex items-start gap-2.5">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${meta.cls}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-slate-200">{i + 1}. {s.name}</span>
                        <span className={`text-xs ${meta.cls}`}>{s.status}</span>
                        <Time t={s.start ?? "未出現"} />
                        <span className="text-[10px] text-slate-600">理想 {s.ideal}</span>
                      </div>
                      {s.note && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{s.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          {/* ── 信任度曲線 ── */}
          <Card icon={<TrendingUpIcon className="h-4 w-4 text-sky-400" />} title="信任度曲線">
            <div className="grid grid-cols-3 gap-3 items-end h-36">
              {curve.map((c, i) => {
                const prev = i > 0 ? curve[i - 1].score : null;
                const diff = prev == null ? null : c.score - prev;
                return (
                  <div key={c.label} className="flex flex-col items-center justify-end h-full gap-1" title={c.note}>
                    <span className="text-sm font-semibold text-white">
                      {c.score}
                      {diff != null && diff !== 0 && (
                        <span className={`ml-1 text-xs ${diff > 0 ? "text-emerald-400" : "text-red-400"}`}>{diff > 0 ? "▲" : "▼"}{Math.abs(diff)}</span>
                      )}
                    </span>
                    <div className="w-full max-w-[56px] rounded-t bg-sky-400/80" style={{ height: `${Math.max(4, c.score)}%` }} />
                    <span className="text-xs text-slate-400">{c.label}</span>
                  </div>
                );
              })}
            </div>
            <ul className="space-y-1">
              {curve.map((c) => c.note && (
                <li key={c.label} className="text-xs text-slate-500 leading-relaxed"><span className="text-slate-400">{c.label}：</span>{c.note}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── 關鍵時刻 ── */}
        <Card icon={<TrendingUpIcon className="h-4 w-4 text-emerald-400" />} title="關鍵時刻">
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs text-emerald-400 flex items-center gap-1"><TrendingUpIcon className="h-3.5 w-3.5" />信任上升</p>
              <EvidenceList items={result.key_moments.up} />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-red-400 flex items-center gap-1"><TrendingDownIcon className="h-3.5 w-3.5" />信任下降</p>
              <EvidenceList items={result.key_moments.down} />
            </div>
          </div>
        </Card>

        {/* ── 痛點關鍵字 ── */}
        <Card icon={<AnchorIcon className="h-4 w-4 text-orange-400" />} title="痛點關鍵字 · Demo 錨點">
          {result.pain_keywords.length === 0 ? (
            <p className="text-xs text-slate-500">這通電話沒有抓到客戶親口說的痛點</p>
          ) : (
            <ul className="space-y-2">
              {result.pain_keywords.map((k, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Time t={k.time} />
                  <span className="text-orange-300 font-medium shrink-0">{k.keyword}</span>
                  {k.quote && <span className="text-xs text-slate-500 leading-relaxed">「{k.quote}」</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── 軟性語助詞 vs 質問句 ── */}
      <Card icon={<MessageCircleIcon className="h-4 w-4 text-purple-400" />} title="顧問用語：軟性語助詞 vs 質問句">
        <div className="space-y-2">
          <div className="flex h-3 rounded-full overflow-hidden bg-slate-800 gap-0.5">
            {ratioTotal > 0 && (
              <>
                <div className="bg-emerald-400" style={{ width: `${(result.softener.count / ratioTotal) * 100}%` }} />
                <div className="bg-red-400" style={{ width: `${(result.interrogation.count / ratioTotal) * 100}%` }} />
              </>
            )}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-300">軟性語助詞 {result.softener.count} 次</span>
            <span className="text-red-300">質問句 {result.interrogation.count} 次</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EvidenceList items={result.softener.examples.map((e) => ({ time: e.time, reason: `「${e.text}」` }))} />
          <EvidenceList items={result.interrogation.examples.map((e) => ({ time: e.time, reason: `「${e.text}」` }))} />
        </div>
      </Card>

      {/* ── 客戶歸類 ── */}
      <Card icon={<TagsIcon className="h-4 w-4 text-amber-400" />} title="客戶歸類">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CLASSIFICATION_FIELDS.map((f) => {
            const v = result.classification[f.key];
            const e = result.classification_evidence[f.key];
            if (!v && "optional" in f) return null;
            return (
              <div key={f.key} className="rounded-lg bg-slate-800/50 border border-slate-700/40 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">{f.title}</span>
                  <span className="text-sm font-semibold text-amber-300">{v ?? "—"}</span>
                </div>
                {e && <EvidenceList items={[e]} />}
              </div>
            );
          })}
        </div>
        {(result.demo_advice.angle || result.demo_advice.disc_tip) && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
            <p className="text-xs text-emerald-400">Demo 應對建議</p>
            {result.demo_advice.angle && <p className="text-sm text-emerald-100 leading-relaxed">🎯 {result.demo_advice.angle}</p>}
            {result.demo_advice.disc_tip && <p className="text-sm text-emerald-100/90 leading-relaxed">🗣️ {result.demo_advice.disc_tip}</p>}
          </div>
        )}
      </Card>

      {(result.speakers.consultant || result.speakers.customer) && (
        <p className="text-xs text-slate-600">
          聲音辨識：顧問 = {result.speakers.consultant || "—"}；客戶 = {result.speakers.customer || "—"}
        </p>
      )}
    </div>
  );
}
