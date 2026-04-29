"use client";
import { useState } from "react";
import { ChevronDownIcon, ShieldCheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Objection {
  issue: string;
  response: string;
}

export function ObjectionSimulator({ objections }: { objections: Objection[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {objections.map((obj, i) => (
        <div
          key={i}
          className={cn(
            "rounded-lg border transition-all duration-200 cursor-pointer",
            open === i
              ? "border-amber-500/50 bg-amber-500/5"
              : "border-slate-700/60 bg-slate-800/40 hover:border-slate-600"
          )}
          onClick={() => setOpen(open === i ? null : i)}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-red-400 text-lg">⚠️</span>
              <span className="text-sm font-medium text-slate-200">{obj.issue}</span>
            </div>
            <ChevronDownIcon
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform duration-200",
                open === i && "rotate-180"
              )}
            />
          </div>

          {open === i && (
            <div className="px-4 pb-4 pt-1 border-t border-amber-500/20">
              <div className="flex items-start gap-3 mt-3">
                <ShieldCheckIcon className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-slate-300 leading-relaxed">{obj.response}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
