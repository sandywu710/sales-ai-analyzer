"use client";
import { useState } from "react";
import { Loader2Icon, PlusIcon, PencilIcon, CheckIcon, XIcon } from "lucide-react";
import type { Consultant } from "@/lib/consultants";

export function ConsultantsManager({ initial }: { initial: Consultant[] }) {
  const [list, setList] = useState(initial);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const call = async (method: "POST" | "PATCH", body: object) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/consultants", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "儲存失敗");
      return data as Consultant;
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!newName.trim()) return;
    const c = await call("POST", { name: newName });
    if (c) { setList([...list, c]); setNewName(""); }
  };

  const update = async (id: string, patch: Partial<Consultant>) => {
    const c = await call("PATCH", { id, ...patch });
    if (c) setList(list.map((x) => (x.id === id ? c : x)));
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 divide-y divide-slate-800">
        {list.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            {editing === c.id ? (
              <>
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && update(c.id, { name: editName })}
                  className="flex-1 h-9 rounded-md bg-slate-800 border border-slate-700 px-3 text-sm"
                />
                <button onClick={() => update(c.id, { name: editName })} className="text-emerald-400 p-1" aria-label="儲存"><CheckIcon className="h-4 w-4" /></button>
                <button onClick={() => setEditing(null)} className="text-slate-500 p-1" aria-label="取消"><XIcon className="h-4 w-4" /></button>
              </>
            ) : (
              <>
                <span className={`flex-1 text-sm ${c.active ? "text-white" : "text-slate-600 line-through"}`}>{c.name}</span>
                {!c.active && <span className="text-xs text-slate-600">已停用</span>}
                <button
                  onClick={() => { setEditing(c.id); setEditName(c.name); }}
                  className="text-slate-500 hover:text-white p-1"
                  aria-label="改名"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => update(c.id, { active: !c.active })}
                  disabled={busy}
                  className={`text-xs px-2.5 py-1 rounded-md border ${
                    c.active ? "border-slate-700 text-slate-400 hover:text-red-300 hover:border-red-500/40" : "border-emerald-500/40 text-emerald-300"
                  }`}
                >
                  {c.active ? "停用" : "重新啟用"}
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="新增顧問名字"
          className="flex-1 h-10 rounded-lg bg-slate-800/60 border border-slate-700 px-3 text-sm placeholder:text-slate-600"
        />
        <button
          onClick={add}
          disabled={busy || !newName.trim()}
          className="flex items-center gap-1.5 text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 rounded-lg disabled:opacity-50"
        >
          {busy ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
          新增
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
