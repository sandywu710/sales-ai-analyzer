"use client";
import { useState } from "react";
import { CopyIcon, CheckIcon } from "lucide-react";

export function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60">
      <div className="flex justify-end p-2 border-b border-slate-800">
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1.5 text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-3 py-1.5 rounded-lg"
        >
          {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          {copied ? "已複製" : "複製"}
        </button>
      </div>
      <pre className="p-4 text-xs text-slate-400 overflow-x-auto max-h-80">{text}</pre>
    </div>
  );
}
