"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon, Loader2Icon } from "lucide-react";

interface Props {
  recordingId: string;
  redirectAfter?: boolean; // true on detail page, false on dashboard
}

export function DeleteRecording({ recordingId, redirectAfter = false }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/recording/${recordingId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "刪除失敗");
      }
      if (redirectAfter) {
        router.push("/dashboard");
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪除失敗");
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 shrink-0">確定刪除？</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-red-500/20 border border-red-500/40 text-red-400 rounded-md hover:bg-red-500/30 transition-colors disabled:opacity-50"
        >
          {deleting && <Loader2Icon className="h-3 w-3 animate-spin" />}
          {deleting ? "刪除中" : "確定"}
        </button>
        <button
          onClick={() => { setConfirming(false); setError(""); }}
          disabled={deleting}
          className="text-xs px-2.5 py-1 bg-slate-700/60 border border-slate-600/40 text-slate-400 rounded-md hover:bg-slate-600 transition-colors"
        >
          取消
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true); }}
      className="p-1.5 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      title="刪除此紀錄"
    >
      <Trash2Icon className="h-4 w-4" />
    </button>
  );
}
