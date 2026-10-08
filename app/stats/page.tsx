export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase";
import { listConsultants, type Consultant } from "@/lib/consultants";
import { listRubrics, type Rubric } from "@/lib/rubrics";
import type { TrustResult } from "@/lib/trust";
import {
  DIMENSIONS, consultantSummary, crossAverages, latestPerRecording, toScore100, type StatRow,
} from "@/lib/stats";
import { formatDuration } from "@/lib/audio";
import { SiteNav } from "@/components/site-nav";
import { SchemaNotice } from "@/components/schema-notice";
import { BarChart3Icon, FilterIcon } from "lucide-react";

// 分類顏色：依選項固定順序（顏色跟著選項走，不跟排名）
const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"];
const UNASSIGNED = "__none__";

type SP = Promise<{ from?: string; to?: string; c?: string | string[]; rubric?: string }>;

interface TrustQueryRow {
  recording_id: string;
  rubric_id: string | null;
  total_score: number;
  call_duration_seconds: number | null;
  result: TrustResult;
  created_at: string;
  recordings: { consultant_id: string | null; created_at: string } | null;
}

async function load(rubricFilter: string | undefined) {
  const supabase = createServerSupabaseClient();
  const [consultants, rubrics] = await Promise.all([listConsultants(supabase), listRubrics(supabase)]);
  const rubricId = rubricFilter ?? rubrics.find((r) => r.is_active)?.id ?? "all";
  let q = supabase
    .from("call_trust_analysis")
    .select("recording_id, rubric_id, total_score, call_duration_seconds, result, created_at, recordings(consultant_id, created_at)");
  if (rubricId !== "all") q = q.eq("rubric_id", rubricId);
  const { data, error } = await q;
  if (error) throw error;
  return { consultants, rubrics, rubricId, rows: (data ?? []) as unknown as TrustQueryRow[] };
}

function pct(n: number | null) {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}

function StackedBar({ counts, options }: { counts: Record<string, number>; options: readonly string[] }) {
  const total = options.reduce((s, o) => s + (counts[o] ?? 0), 0);
  if (!total) return <p className="text-xs text-slate-600">沒有資料</p>;
  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 bg-slate-800">
        {options.map((o, i) =>
          counts[o] ? (
            <div key={o} title={`${o}：${counts[o]} 通`} style={{ width: `${(counts[o] / total) * 100}%`, background: SERIES[i % SERIES.length] }} />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {options.map((o, i) =>
          counts[o] ? (
            <span key={o} className="flex items-center gap-1 text-[11px] text-slate-400">
              <span className="h-2 w-2 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />
              {o} {counts[o]}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function StatsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  let loaded: Awaited<ReturnType<typeof load>> | null = null;
  try {
    loaded = await load(sp.rubric);
  } catch {}

  if (!loaded) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteNav active="/stats" />
        <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8"><SchemaNotice /></main>
      </div>
    );
  }

  const { consultants, rubrics, rubricId, rows: raw } = loaded;
  const selected = new Set(([] as string[]).concat(sp.c ?? []));
  const from = sp.from ?? "";
  const to = sp.to ?? "";

  // 篩選：日期（通話上傳日）、顧問
  const rows: StatRow[] = latestPerRecording(raw)
    .map((r) => ({
      recording_id: r.recording_id,
      consultant_id: r.recordings?.consultant_id ?? null,
      call_date: (r.recordings?.created_at ?? r.created_at).slice(0, 10),
      score100: toScore100(r.total_score, r.result?.max_total ?? 100),
      duration: r.call_duration_seconds,
      result: r.result,
    }))
    .filter((r) => (!from || r.call_date >= from) && (!to || r.call_date <= to))
    .filter((r) => selected.size === 0 || selected.has(r.consultant_id ?? UNASSIGNED));

  // 顯示的顧問：有勾選就顯示勾選的；沒勾就顯示啟用中＋有資料的
  const withData = new Set(rows.map((r) => r.consultant_id ?? UNASSIGNED));
  const people: Pick<Consultant, "id" | "name" | "active">[] = [
    ...consultants.filter((c) => (selected.size ? selected.has(c.id) : c.active || withData.has(c.id))),
    ...(withData.has(UNASSIGNED) ? [{ id: UNASSIGNED, name: "未指定顧問", active: true }] : []),
  ];
  const byPerson = people.map((p) => {
    const mine = rows.filter((r) => (r.consultant_id ?? UNASSIGNED) === p.id);
    return { person: p, s: consultantSummary(mine) };
  });
  const team = consultantSummary(rows);
  const ranking = byPerson.filter((x) => x.s.count > 0).sort((a, b) => (b.s.stageRate ?? 0) - (a.s.stageRate ?? 0));
  const currentRubric = rubrics.find((r: Rubric) => r.id === rubricId);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav active="/stats" />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3Icon className="h-5 w-5 text-amber-400" />
          <h1 className="text-xl font-bold">統計儀表板</h1>
        </div>

        {/* 篩選 */}
        <form method="get" className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
              <span className="text-xs text-slate-500 block">開始日期</span>
              <input type="date" name="from" defaultValue={from} className="h-9 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-white [color-scheme:dark]" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-500 block">結束日期</span>
              <input type="date" name="to" defaultValue={to} className="h-9 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-white [color-scheme:dark]" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-500 block">評分標準版本</span>
              <select name="rubric" defaultValue={rubricId} className="h-9 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-white">
                {rubrics.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}{r.is_active ? "（使用中）" : ""}</option>
                ))}
                <option value="all">全部版本</option>
              </select>
            </label>
            <button className="h-9 flex items-center gap-1.5 text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 rounded-lg">
              <FilterIcon className="h-4 w-4" /> 套用
            </button>
            <a href="/stats" className="h-9 flex items-center text-sm text-slate-500 hover:text-white px-2">清除</a>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 self-center">顧問（可多選，不選＝全部）：</span>
            {[...consultants, { id: UNASSIGNED, name: "未指定", active: true }].map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-xs text-slate-300 border border-slate-700 rounded-full px-2.5 py-1 cursor-pointer has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500/15">
                <input type="checkbox" name="c" value={c.id} defaultChecked={selected.has(c.id)} className="accent-amber-500" />
                {c.name}{!c.active && "（停用）"}
              </label>
            ))}
          </div>
        </form>

        {/* 團隊總覽數字 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "分析通數", value: String(team.count) },
            { label: "平均信任分數", value: team.avgScore == null ? "—" : String(Math.round(team.avgScore)) },
            { label: "平均通話長度", value: formatDuration(team.avgDuration) },
            { label: "四階段完成率", value: pct(team.stageRate) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600">
          目前標準：{currentRubric?.name ?? "全部版本"}。同一通電話分析多次時，只計算最新一次。
        </p>

        {team.count === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-500">
            這個條件下還沒有信任度分析資料。上傳新錄音，或到舊紀錄按「用目前標準分析」。
          </div>
        ) : (
          <>
            {/* 每位顧問卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {byPerson.map(({ person, s }) => (
                <div key={person.id} className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{person.name}{!person.active && <span className="text-xs text-slate-600">（停用）</span>}</span>
                    <span className="text-xs text-slate-500">{s.count} 通</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-slate-800/50 py-2">
                      <p className="text-[11px] text-slate-500">平均信任</p>
                      <p className="text-lg font-bold text-sky-300">{s.avgScore == null ? "—" : Math.round(s.avgScore)}</p>
                    </div>
                    <div className="rounded-lg bg-slate-800/50 py-2">
                      <p className="text-[11px] text-slate-500">平均長度</p>
                      <p className="text-lg font-bold text-white">{formatDuration(s.avgDuration)}</p>
                    </div>
                  </div>
                  {s.count > 0 && DIMENSIONS.map((d) => (
                    <div key={d.key} className="space-y-1">
                      <p className="text-[11px] text-slate-500">{d.title}</p>
                      <StackedBar counts={s.dist[d.key]} options={d.options} />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* 團隊並排比較 */}
            <Panel title="團隊總覽：誰約到哪種客人最多" sub="數字是通數，顏色越深代表越多">
              <div className="space-y-6">
                {DIMENSIONS.map((d) => {
                  const max = Math.max(1, ...byPerson.flatMap(({ s }) => d.options.map((o) => s.dist[d.key][o] ?? 0)));
                  return (
                    <div key={d.key} className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[520px]">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="text-left font-normal py-1.5 pr-2">{d.title}</th>
                            {d.options.map((o) => <th key={o} className="font-normal px-1 py-1.5">{o}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {byPerson.map(({ person, s }) => (
                            <tr key={person.id}>
                              <td className="py-1 pr-2 text-slate-300 whitespace-nowrap">{person.name}</td>
                              {d.options.map((o) => {
                                const n = s.dist[d.key][o] ?? 0;
                                return (
                                  <td key={o} className="px-0.5 py-0.5">
                                    <div
                                      title={`${person.name}・${o}：${n} 通`}
                                      className={`rounded text-center py-1.5 ${n ? "text-white" : "text-slate-700"}`}
                                      style={{ background: n ? `rgba(57,135,229,${0.15 + 0.75 * (n / max)})` : "rgba(30,41,59,0.5)" }}
                                    >
                                      {n}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* 交叉分析 */}
            <Panel title="交叉分析：哪種客人的平均信任分數最高／最低" sub="由高到低排列，括號內是通數">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {DIMENSIONS.map((d) => {
                  const list = crossAverages(rows, d.key, d.options);
                  return (
                    <div key={d.key} className="space-y-2">
                      <p className="text-xs text-slate-400">{d.title}</p>
                      {list.map((x, i) => (
                        <div key={x.label} className="space-y-1" title={`${x.label}：平均 ${Math.round(x.avg ?? 0)} 分（${x.count} 通）`}>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300">
                              {x.label} <span className="text-slate-600">({x.count})</span>
                              {list.length > 1 && i === 0 && <span className="ml-1 text-emerald-400">最高</span>}
                              {list.length > 1 && i === list.length - 1 && <span className="ml-1 text-red-400">最低</span>}
                            </span>
                            <span className="text-white font-semibold">{Math.round(x.avg ?? 0)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full bg-sky-400" style={{ width: `${x.avg ?? 0}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* 顧問執行力排行 */}
            <Panel title="顧問執行力排行" sub="依四階段完成率排序（有＝1、部分＝0.5、沒有＝0）">
              <div className="space-y-3">
                {ranking.map(({ person, s }, i) => {
                  const ratioTotal = s.softener + s.interrogation;
                  return (
                    <div key={person.id} className="grid grid-cols-[1.5rem_1fr] sm:grid-cols-[1.5rem_7rem_1fr_1fr] gap-x-3 gap-y-1.5 items-center">
                      <span className="text-sm font-bold text-amber-400">{i + 1}</span>
                      <span className="text-sm text-white">{person.name} <span className="text-xs text-slate-600">{s.count} 通</span></span>
                      <div className="col-start-2 sm:col-start-auto space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-500"><span>四階段完成率</span><span className="text-white">{pct(s.stageRate)}</span></div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(s.stageRate ?? 0) * 100}%` }} />
                        </div>
                      </div>
                      <div className="col-start-2 sm:col-start-auto space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-emerald-300">軟性 {s.softener}</span>
                          <span className="text-red-300">質問 {s.interrogation}</span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-slate-800 gap-0.5">
                          {ratioTotal > 0 && (
                            <>
                              <div className="bg-emerald-400" style={{ width: `${(s.softener / ratioTotal) * 100}%` }} />
                              <div className="bg-red-400" style={{ width: `${(s.interrogation / ratioTotal) * 100}%` }} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </>
        )}
      </main>
    </div>
  );
}
