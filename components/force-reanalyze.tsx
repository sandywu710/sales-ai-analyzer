"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";

export function ForceReanalyze({ recordingId }: { recordingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id: recordingId, force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重新分析失敗");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "重新分析失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 disabled:opacity-40 transition-colors"
      >
        {loading
          ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
          : <RefreshCwIcon className="h-3.5 w-3.5" />}
        {loading ? "重新分析中..." : "重新分析"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
