"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, RefreshCwIcon, AlertCircleIcon, BanIcon } from "lucide-react";

const MAX_RETRIES = 2;

export function RetryAnalysis({ recordingId }: { recordingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [failCount, setFailCount] = useState(0);

  const retry = async () => {
    if (failCount >= MAX_RETRIES || loading) return;
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
      setFailCount((n) => n + 1);
      setError(e instanceof Error ? e.message : "分析失敗");
    } finally {
      setLoading(false);
    }
  };

  const exhausted = failCount >= MAX_RETRIES;

  return (
    <div className="space-y-3">
      {exhausted ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-400">
          <BanIcon className="h-4 w-4 shrink-0 text-slate-500" />
          已重試 {MAX_RETRIES} 次仍失敗，請稍後再重新整理頁面，或確認 Gemini API 狀態
        </div>
      ) : (
        <button
          onClick={retry}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold rounded-lg text-sm transition-colors"
        >
          {loading
            ? <Loader2Icon className="h-4 w-4 animate-spin" />
            : <RefreshCwIcon className="h-4 w-4" />}
          {loading ? "分析中..." : `重新分析${failCount > 0 ? `（剩餘 ${MAX_RETRIES - failCount} 次）` : ""}`}
        </button>
      )}
      {error && !exhausted && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          <AlertCircleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="break-all">{error}</span>
        </div>
      )}
      {error && exhausted && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          <AlertCircleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="break-all">最後錯誤：{error}</span>
        </div>
      )}
    </div>
  );
}
