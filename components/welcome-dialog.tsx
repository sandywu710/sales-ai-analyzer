"use client";
import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

const STORAGE_KEY = "sales-ai-welcome-seen";

export function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  const handleClose = () => {
    if (dontShow) localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-700/60 bg-[#0b1628] shadow-2xl shadow-black/60 p-8 space-y-5">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
          aria-label="關閉"
        >
          <XIcon className="h-5 w-5" />
        </button>

        <WelcomeContent />

        <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-amber-500"
            />
            不再顯示
          </label>
          <button
            onClick={handleClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-sm transition-colors"
          >
            了解了！
          </button>
        </div>
      </div>
    </div>
  );
}

export function WelcomeContent() {
  return (
    <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
      <p className="text-xl font-bold text-white">嗨，我是 Sandy 👋</p>

      <p>
        我發現每次打完邀約電話，要準備 Demo 的時候都要自己回想「這個人是什麼個性？他在意什麼？我要從哪裡切入？」，這樣很花時間，而且容易漏掉重點。
      </p>

      <p>
        所以我做了這個——你只要把電話錄音丟進來，AI 會自動幫你整理出這個人的背景、動機、性格，然後直接給你一套針對他的破冰話術和 Demo 攻略。
      </p>

      <p className="text-white font-semibold">不用再自己想，直接照著打就對了。</p>

      <div>
        <p className="font-semibold text-white mb-2">怎麼用？</p>
        <ol className="space-y-1.5">
          {[
            "上傳電話錄音（mp3 或 wav）",
            "等 AI 分析（大概 30 秒）",
            "看報告，準備 Demo",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <p className="text-slate-400">
        有任何問題或想要新功能，找我說就好。
        <br />
        <span className="text-slate-300 font-medium">— Sandy</span>
      </p>
    </div>
  );
}
