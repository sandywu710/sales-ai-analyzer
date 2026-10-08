"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, GaugeIcon } from "lucide-react";

// 「用目前標準分析／重新分析」按鈕（按了才分析，不會自動跑）
export function TrustAnalyzeButton({ recordingId, label }: { recordingId: string; label: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trust-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id: recordingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "分析失敗");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-2 text-sm bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-medium px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <GaugeIcon className="h-4 w-4" />}
        {loading ? "分析中，約 1 分鐘…" : label}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
