"use client";
import { useState } from "react";
import { CopyIcon, CheckIcon, IdCardIcon } from "lucide-react";
import { STUDENT_INFO_FIELDS } from "@/lib/trust-prompt";

// 學生資訊：一鍵複製成「背景：／現況：／個性：／想學原因：」格式
export function StudentInfoCard({ info }: { info?: Record<string, string> }) {
  const [copied, setCopied] = useState(false);
  const hasInfo = !!info && STUDENT_INFO_FIELDS.some((f) => info[f.key]);
  const text = STUDENT_INFO_FIELDS.map((f) => `${f.label}：${info?.[f.key] ?? ""}`).join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 舊瀏覽器備用做法
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
          <IdCardIcon className="h-4 w-4 text-amber-400" /> 學生資訊
        </div>
        {hasInfo && (
          <button
            onClick={copy}
            className="flex items-center gap-1.5 text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            {copied ? "已複製" : "一鍵複製"}
          </button>
        )}
      </div>
      {hasInfo ? (
        <dl className="space-y-2">
          {STUDENT_INFO_FIELDS.map((f) => (
            <div key={f.key} className="flex gap-2 text-sm leading-relaxed">
              <dt className="text-amber-400 shrink-0 font-medium">{f.label}：</dt>
              <dd className="text-slate-200">{info?.[f.key] || "—"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-slate-500">這筆是舊的分析，還沒有學生資訊。按上方「用目前標準重新分析」就會產生。</p>
      )}
    </div>
  );
}
