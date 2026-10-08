"use client";
import { useState } from "react";
import { Loader2Icon, PlusIcon, Trash2Icon, CopyIcon, SaveIcon, CheckCircle2Icon, AlertTriangleIcon, StarIcon } from "lucide-react";
import type { Rubric, RubricDimension, RubricLevel } from "@/lib/rubrics";

const BASIS_OPTIONS = ["內容", "聲音", "內容＋聲音", "內容＋聲音（看顧問）"];

const inputCls = "w-full rounded-md bg-slate-800/80 border border-slate-700 px-3 text-sm text-white placeholder:text-slate-600";

export function RubricEditor({ initial }: { initial: Rubric[] }) {
  const [rubrics, setRubrics] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial.find((r) => r.is_active)?.id ?? initial[0]?.id);
  const selected = rubrics.find((r) => r.id === selectedId)!;
  const [draft, setDraft] = useState<Rubric>(selected);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(selected);
  const total = draft.dimensions.reduce((s, d) => s + (Number(d.max_score) || 0), 0);

  const select = (id: string) => {
    if (dirty && !confirm("目前的修改還沒儲存，確定要切換版本嗎？")) return;
    const r = rubrics.find((x) => x.id === id)!;
    setSelectedId(id);
    setDraft(r);
    setMsg(null);
  };

  const api = async (method: "POST" | "PATCH", body: object) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/rubrics", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "失敗");
      return data as Rubric;
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "失敗" });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!draft.name.trim()) return setMsg({ ok: false, text: "請填版本名稱" });
    const r = await api("PATCH", { id: draft.id, name: draft.name, background: draft.background, dimensions: draft.dimensions, levels: draft.levels });
    if (r) {
      setRubrics(rubrics.map((x) => (x.id === r.id ? r : x)));
      setDraft(r);
      setMsg({ ok: true, text: total === 100 ? "已儲存" : `已儲存，但配分總和是 ${total}，不是 100` });
    }
  };

  const copy = async () => {
    if (dirty) return setMsg({ ok: false, text: "請先儲存目前的修改，再複製" });
    const name = prompt("新版本的名稱（例如：老闆版 v1）", `${selected.name}（複製）`);
    if (!name) return;
    const r = await api("POST", { action: "copy", id: selected.id, name });
    if (r) {
      setRubrics([...rubrics, r]);
      setSelectedId(r.id);
      setDraft(r);
      setMsg({ ok: true, text: `已建立「${r.name}」，可以開始修改` });
    }
  };

  const activate = async () => {
    if (dirty) return setMsg({ ok: false, text: "請先儲存目前的修改" });
    if (total !== 100) return setMsg({ ok: false, text: `配分總和是 ${total}，要等於 100 才能設為使用中` });
    const r = await api("POST", { action: "activate", id: selected.id });
    if (r) {
      setRubrics(rubrics.map((x) => ({ ...x, is_active: x.id === r.id })));
      setDraft({ ...draft, is_active: true });
      setMsg({ ok: true, text: `「${r.name}」已設為使用中` });
    }
  };

  const setDim = (i: number, patch: Partial<RubricDimension>) =>
    setDraft({ ...draft, dimensions: draft.dimensions.map((d, j) => (j === i ? { ...d, ...patch } : d)) });
  const setLevel = (i: number, patch: Partial<RubricLevel>) =>
    setDraft({ ...draft, levels: draft.levels.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  return (
    <div className="space-y-6">
      {/* 版本列表 */}
      <div className="flex flex-wrap gap-2">
        {rubrics.map((r) => (
          <button
            key={r.id}
            onClick={() => select(r.id)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
              r.id === selectedId ? "border-amber-500 bg-amber-500/15 text-amber-200" : "border-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            {r.is_active && <StarIcon className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
            {r.name}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-2 flex-wrap">
          {draft.is_active ? (
            <span className="text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2.5 py-1 flex items-center gap-1">
              <CheckCircle2Icon className="h-3.5 w-3.5" /> 使用中
            </span>
          ) : (
            <span className="text-xs text-slate-500 border border-slate-700 rounded-full px-2.5 py-1">未使用</span>
          )}
          <span className={`text-xs rounded-full px-2.5 py-1 border flex items-center gap-1 ${
            total === 100 ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" : "text-red-300 border-red-500/40 bg-red-500/10"
          }`}>
            {total !== 100 && <AlertTriangleIcon className="h-3.5 w-3.5" />}
            配分總和 {total} / 100{total !== 100 && "，請調整"}
          </span>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs text-slate-400">版本名稱</span>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={`${inputCls} h-10`} />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs text-slate-400">通話背景說明（會一起給 AI 參考）</span>
          <textarea
            value={draft.background}
            onChange={(e) => setDraft({ ...draft, background: e.target.value })}
            rows={4}
            className={`${inputCls} py-2 leading-relaxed`}
          />
        </label>

        {/* 面向 */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-300">評分面向</p>
          {draft.dimensions.map((d, i) => (
            <div key={d.key} className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-3 sm:p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">面向 {i + 1} 名稱</span>
                  <input value={d.name} onChange={(e) => setDim(i, { name: e.target.value })} className={`${inputCls} h-9`} />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">判斷依據</span>
                  <select value={d.basis} onChange={(e) => setDim(i, { basis: e.target.value })} className={`${inputCls} h-9`}>
                    {[...new Set([...BASIS_OPTIONS, d.basis])].map((b) => <option key={b}>{b}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">配分</span>
                  <input
                    type="number" min={0} max={100}
                    value={d.max_score}
                    onChange={(e) => setDim(i, { max_score: Number(e.target.value) })}
                    className={`${inputCls} h-9 sm:w-20`}
                  />
                </label>
                <button
                  onClick={() => confirm(`確定刪除「${d.name}」這個面向？`) && setDraft({ ...draft, dimensions: draft.dimensions.filter((_, j) => j !== i) })}
                  className="h-9 px-3 rounded-md border border-slate-700 text-slate-500 hover:text-red-300 hover:border-red-500/40 flex items-center justify-center gap-1 text-xs"
                >
                  <Trash2Icon className="h-4 w-4" /> 刪除
                </button>
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-slate-500">評分說明（AI 會照這段判斷）</span>
                <textarea value={d.description} onChange={(e) => setDim(i, { description: e.target.value })} rows={4} className={`${inputCls} py-2 leading-relaxed`} />
              </label>
            </div>
          ))}
          <button
            onClick={() =>
              setDraft({
                ...draft,
                dimensions: [...draft.dimensions, { key: `d${Date.now()}`, name: "新面向", basis: "內容", max_score: 0, description: "" }],
              })
            }
            className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300"
          >
            <PlusIcon className="h-4 w-4" /> 新增面向
          </button>
        </div>

        {/* 等級門檻 */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-300">信任等級門檻（以 100 分計）</p>
          {draft.levels.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="number" min={0} max={100}
                value={l.min}
                onChange={(e) => setLevel(i, { min: Number(e.target.value) })}
                className={`${inputCls} h-9 w-20`}
              />
              <span className="text-xs text-slate-500 shrink-0">分以上</span>
              <input value={l.label} onChange={(e) => setLevel(i, { label: e.target.value })} className={`${inputCls} h-9`} />
              <button
                onClick={() => setDraft({ ...draft, levels: draft.levels.filter((_, j) => j !== i) })}
                className="p-2 text-slate-500 hover:text-red-300"
                aria-label="刪除等級"
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setDraft({ ...draft, levels: [...draft.levels, { min: 0, label: "新等級" }] })}
            className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300"
          >
            <PlusIcon className="h-4 w-4" /> 新增等級
          </button>
        </div>

        {/* 動作 */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="flex items-center gap-1.5 text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg disabled:opacity-40"
          >
            {busy ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
            儲存修改
          </button>
          <button onClick={copy} disabled={busy} className="flex items-center gap-1.5 text-sm border border-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg">
            <CopyIcon className="h-4 w-4" /> 複製成新版本
          </button>
          {!draft.is_active && (
            <button onClick={activate} disabled={busy} className="flex items-center gap-1.5 text-sm border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 px-4 py-2 rounded-lg">
              <StarIcon className="h-4 w-4" /> 設為使用中
            </button>
          )}
          {dirty && <span className="text-xs text-amber-400">有未儲存的修改</span>}
          {msg && <span className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</span>}
        </div>
      </div>
    </div>
  );
}
