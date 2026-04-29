"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, RefreshCwIcon, AlertCircleIcon } from "lucide-react";

export function RetryAnalysis({ recordingId }: { recordingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const retry = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id: recordingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析失敗");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "分析失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={retry}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold rounded-lg text-sm transition-colors"
      >
        {loading
          ? <Loader2Icon className="h-4 w-4 animate-spin" />
          : <RefreshCwIcon className="h-4 w-4" />}
        {loading ? "分析中..." : "重新分析"}
      </button>
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          <AlertCircleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="break-all">{error}</span>
        </div>
      )}
    </div>
  );
}
