"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  UploadCloudIcon,
  FileAudioIcon,
  Loader2Icon,
  CheckCircleIcon,
  XCircleIcon,
  ZapIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "uploading" | "transcribing" | "analyzing" | "trust" | "done" | "error";

interface ConsultantOption { id: string; name: string; active: boolean }
const LAST_CONSULTANT_KEY = "sales-ai:last-consultant";

// 讀取音檔長度（秒），讀不到就回傳 null
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      const done = (v: number | null) => { URL.revokeObjectURL(url); resolve(v); };
      audio.preload = "metadata";
      audio.onloadedmetadata = () => done(isFinite(audio.duration) ? audio.duration : null);
      audio.onerror = () => done(null);
      setTimeout(() => done(null), 8000);
      audio.src = url;
    } catch {
      resolve(null);
    }
  });
}

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
const ALLOWED_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/m4a", "audio/aac"];
const ALLOWED_EXT = /\.(mp3|wav|m4a|aac)$/i;

const STEPS: Record<Status, { label: string; step: number }> = {
  idle:        { label: "",           step: 0 },
  uploading:   { label: "上傳中...",   step: 1 },
  transcribing:{ label: "轉錄中...",   step: 2 },
  analyzing:   { label: "AI 分析中...",step: 3 },
  trust:       { label: "信任度分析中...", step: 4 },
  done:        { label: "完成！",      step: 5 },
  error:       { label: "發生錯誤",    step: 0 },
};

export function UploadForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  // 顧問名單（資料庫還沒設定好時 consultants 會是 null，就不顯示選單）
  const [consultants, setConsultants] = useState<ConsultantOption[] | null>(null);
  const [consultantId, setConsultantId] = useState("");
  const [customerAlias, setCustomerAlias] = useState("");

  useEffect(() => {
    fetch("/api/consultants")
      .then((r) => (r.ok ? r.json() : null))
      .then((list: ConsultantOption[] | null) => {
        if (!Array.isArray(list)) return;
        const active = list.filter((c) => c.active);
        setConsultants(active);
        try {
          const last = localStorage.getItem(LAST_CONSULTANT_KEY);
          if (last && active.some((c) => c.id === last)) setConsultantId(last);
        } catch {}
      })
      .catch(() => {});
  }, []);

  const needConsultant = consultants !== null && !consultantId;

  const pickConsultant = (id: string) => {
    setConsultantId(id);
    try { localStorage.setItem(LAST_CONSULTANT_KEY, id); } catch {}
  };

  // 逐字稿完成後，接著做信任度分析（失敗不擋，報告頁可以再按一次）
  const runTrust = async (recordingId: string) => {
    if (consultants === null) return;
    setStatus("trust");
    try {
      await fetch("/api/trust-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id: recordingId }),
      });
    } catch {}
  };

  const handleFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.test(file.name)) {
      setErrorMsg("僅支援 .mp3 / .wav / .m4a 格式");
      setStatus("error");
      return;
    }
    setSelectedFile(file);
    setStatus("idle");
    setErrorMsg("");
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const submitAudio = async () => {
    if (!selectedFile || submittingRef.current || needConsultant) return;
    submittingRef.current = true;
    setErrorMsg("");

    try {
      const durationSeconds = await readDuration(selectedFile);

      // Step 1: Get signed upload URL from our API (tiny request)
      setStatus("uploading");
      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: selectedFile.name, user_id: DEMO_USER_ID }),
      });
      if (!urlRes.ok) throw new Error(await urlRes.text());
      const { signed_url, path } = await urlRes.json();

      // Step 2: Upload file DIRECTLY to Supabase Storage (bypasses Vercel entirely)
      const uploadRes = await fetch(signed_url, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type || "audio/mpeg" },
        body: selectedFile,
      });
      if (!uploadRes.ok) throw new Error("Storage upload failed");

      // Step 3: Transcribe (server downloads from Supabase, no file in request)
      setStatus("transcribing");
      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storage_path: path, user_id: DEMO_USER_ID, filename: selectedFile.name,
          consultant_id: consultantId || null, customer_alias: customerAlias, duration_seconds: durationSeconds,
        }),
      });
      if (!transcribeRes.ok) throw new Error(await transcribeRes.text());

      setStatus("analyzing");
      const data = await transcribeRes.json();
      await runTrust(data.recording_id);

      setStatus("done");
      setTimeout(() => router.push(`/recording/${data.recording_id}`), 800);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "上傳失敗");
      setStatus("error");
    } finally {
      submittingRef.current = false;
    }
  };

  const submitText = async () => {
    if (!transcript.trim() || submittingRef.current || needConsultant) return;
    submittingRef.current = true;
    setStatus("analyzing");
    setErrorMsg("");
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(), user_id: DEMO_USER_ID,
          consultant_id: consultantId || null, customer_alias: customerAlias,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      await runTrust(data.recording_id);
      setStatus("done");
      setTimeout(() => router.push(`/recording/${data.recording_id}`), 800);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "分析失敗");
      setStatus("error");
    } finally {
      submittingRef.current = false;
    }
  };

  const busy = status !== "idle" && status !== "error";
  const currentStep = STEPS[status];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {consultants !== null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          <label className="space-y-1.5">
            <span className="text-xs text-slate-400">我是哪位顧問 <span className="text-red-400">*必選</span></span>
            <select
              value={consultantId}
              onChange={(e) => pickConsultant(e.target.value)}
              disabled={busy}
              className={cn(
                "w-full h-10 rounded-lg bg-slate-800/60 border px-3 text-sm text-white",
                consultantId ? "border-slate-700" : "border-amber-500/60"
              )}
            >
              <option value="">請選擇…</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs text-slate-400">客戶暱稱或代號（選填）</span>
            <input
              value={customerAlias}
              onChange={(e) => setCustomerAlias(e.target.value)}
              disabled={busy}
              placeholder="例如：小美、A123"
              className="w-full h-10 rounded-lg bg-slate-800/60 border border-slate-700 px-3 text-sm text-white placeholder:text-slate-600"
            />
          </label>
        </div>
      )}

      <Tabs defaultValue="audio">
        <TabsList className="w-full">
          <TabsTrigger value="audio" className="flex-1 gap-2">
            <FileAudioIcon className="h-4 w-4" /> 上傳音檔
          </TabsTrigger>
          <TabsTrigger value="text" className="flex-1 gap-2">
            <ZapIcon className="h-4 w-4" /> 貼上逐字稿
          </TabsTrigger>
        </TabsList>

        {/* Audio Tab */}
        <TabsContent value="audio">
          <div
            className={cn(
              "relative rounded-xl border-2 border-dashed transition-all duration-200 p-10 text-center cursor-pointer",
              dragOver
                ? "border-amber-500 bg-amber-500/10"
                : selectedFile
                ? "border-emerald-500/60 bg-emerald-500/5"
                : "border-slate-700 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !busy && fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".mp3,.wav,.m4a,.aac,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <UploadCloudIcon className={cn(
              "h-12 w-12 mx-auto mb-4 transition-colors",
              selectedFile ? "text-emerald-400" : "text-slate-500"
            )} />
            {selectedFile ? (
              <div>
                <p className="text-emerald-400 font-medium">{selectedFile.name}</p>
                <p className="text-slate-500 text-sm mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-slate-300 font-medium">拖曳或點擊上傳</p>
                <p className="text-slate-500 text-sm mt-1">支援 .mp3 / .wav / .m4a，無大小限制</p>
              </div>
            )}
          </div>
          <Button
            className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold h-12 text-base"
            disabled={!selectedFile || busy || needConsultant}
            onClick={submitAudio}
          >
            {busy ? <Loader2Icon className="h-5 w-5 animate-spin mr-2" /> : null}
            {busy ? currentStep.label : needConsultant ? "請先選擇顧問" : "開始分析"}
          </Button>
        </TabsContent>

        {/* Text Tab */}
        <TabsContent value="text">
          <Textarea
            placeholder="將邀約電話逐字稿貼在這裡..."
            className="h-52 text-sm"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={busy}
          />
          <Button
            className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold h-12 text-base"
            disabled={!transcript.trim() || busy || needConsultant}
            onClick={submitText}
          >
            {busy ? <Loader2Icon className="h-5 w-5 animate-spin mr-2" /> : null}
            {busy ? currentStep.label : needConsultant ? "請先選擇顧問" : "開始分析"}
          </Button>
        </TabsContent>
      </Tabs>

      {/* Progress bar */}
      {status !== "idle" && status !== "error" && (
        <div className="space-y-5 pt-1">
          {/* Step circles */}
          <div className="flex items-center">
            {(["uploading","transcribing","analyzing","trust","done"] as Status[]).map((s, i) => {
              const labels = ["上傳中","轉錄中","分析中","信任度","完成"];
              const stepNum = STEPS[s].step;
              const curStep = STEPS[status].step;
              const isCompleted = curStep > stepNum;
              const isActive    = curStep === stepNum;
              return (
                <div key={s} className="contents">
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div className={cn(
                      "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                      isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : isActive
                        ? "bg-amber-500/10 border-amber-500 text-amber-400"
                        : "bg-slate-800/60 border-slate-700 text-slate-600"
                    )}>
                      {isCompleted ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : isActive ? (
                        <Loader2Icon className="h-5 w-5 animate-spin" />
                      ) : (
                        <span className="text-xs font-bold">{i + 1}</span>
                      )}
                    </div>
                    <span className={cn(
                      "text-xs font-medium whitespace-nowrap",
                      isCompleted ? "text-emerald-400" :
                      isActive    ? "text-amber-400"   : "text-slate-600"
                    )}>
                      {labels[i]}
                    </span>
                  </div>
                  {i < 4 && (
                    <div className={cn(
                      "flex-1 h-0.5 mb-5 mx-1.5 rounded-full transition-all duration-700",
                      STEPS[status].step > STEPS[s].step ? "bg-emerald-500" : "bg-slate-700"
                    )} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Animated fill bar */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-in-out",
                status === "done"
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-amber-500 to-amber-300"
              )}
              style={{
                width:
                  status === "uploading"    ? "20%"  :
                  status === "transcribing" ? "40%"  :
                  status === "analyzing"    ? "60%"  :
                  status === "trust"        ? "80%"  :
                  status === "done"         ? "100%" : "0%",
              }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && errorMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <XCircleIcon className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
