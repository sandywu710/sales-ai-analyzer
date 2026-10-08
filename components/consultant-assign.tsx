"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, UserCheckIcon } from "lucide-react";

// 紀錄頁：補選／更改顧問
export function ConsultantAssign({
  recordingId, consultantId, consultants,
}: {
  recordingId: string;
  consultantId: string | null;
  consultants: { id: string; name: string; active: boolean }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(consultantId ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async (id: string) => {
    setValue(id);
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/recording/${recordingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultant_id: id || null }),
    });
    setSaving(false);
    setMsg(res.ok ? "已儲存" : "儲存失敗");
    if (res.ok) router.refresh();
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap rounded-lg border px-3 py-2 text-sm ${
      value ? "border-slate-700/60 bg-slate-900/60" : "border-amber-500/40 bg-amber-500/10"
    }`}>
      <UserCheckIcon className="h-4 w-4 text-amber-400" />
      <span className="text-slate-400">{value ? "顧問" : "這筆還沒有顧問，請補選"}</span>
      <select
        value={value}
        onChange={(e) => save(e.target.value)}
        disabled={saving}
        className="h-8 rounded-md bg-slate-800 border border-slate-700 px-2 text-sm text-white"
      >
        <option value="">未指定</option>
        {consultants.map((c) => (
          <option key={c.id} value={c.id}>{c.name}{c.active ? "" : "（已停用）"}</option>
        ))}
      </select>
      {saving && <Loader2Icon className="h-4 w-4 animate-spin text-slate-400" />}
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
    </div>
  );
}
