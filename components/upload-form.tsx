"use client";
import { useState, useRef, useCallback } from "react";
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

type Status = "idle" | "uploading" | "transcribing" | "analyzing" | "done" | "error";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";
const ALLOWED_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav"];

const STEPS: Record<Status, { label: string; step: number }> = {
  idle:        { label: "",           step: 0 },
  uploading:   { label: "上傳中...",   step: 1 },
  transcribing:{ label: "轉錄中...",   step: 2 },
  analyzing:   { label: "AI 分析中...",step: 3 },
  done:        { label: "完成！",      step: 4 },
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

  const handleFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg("僅支援 .mp3 / .wav 格式");
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
    if (!selectedFile) return;
    setErrorMsg("");

    try {
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
        body: JSON.stringify({ storage_path: path, user_id: DEMO_USER_ID }),
      });
      if (!transcribeRes.ok) throw new Error(await transcribeRes.text());

      setStatus("analyzing");
      const data = await transcribeRes.json();

      setStatus("done");
      setTimeout(() => router.push(`/recording/${data.recording_id}`), 800);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "上傳失敗");
      setStatus("error");
    }
  };

  const submitText = async () => {
    if (!transcript.trim()) return;
    setStatus("analyzing");
    setErrorMsg("");
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.trim(), user_id: DEMO_USER_ID }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStatus("done");
      setTimeout(() => router.push(`/recording/${data.recording_id}`), 800);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "分析失敗");
      setStatus("error");
    }
  };

  const busy = status !== "idle" && status !== "error";
  const currentStep = STEPS[status];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
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
              accept=".mp3,.wav,audio/mpeg,audio/wav"
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
                <p className="text-slate-500 text-sm mt-1">支援 .mp3 / .wav，無大小限制</p>
              </div>
            )}
          </div>
          <Button
            className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold h-12 text-base"
            disabled={!selectedFile || busy}
            onClick={submitAudio}
          >
            {busy ? <Loader2Icon className="h-5 w-5 animate-spin mr-2" /> : null}
            {busy ? currentStep.label : "開始分析"}
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
            disabled={!transcript.trim() || busy}
            onClick={submitText}
          >
            {busy ? <Loader2Icon className="h-5 w-5 animate-spin mr-2" /> : null}
            {busy ? currentStep.label : "開始分析"}
          </Button>
        </TabsContent>
      </Tabs>

      {/* Status bar */}
      {status !== "idle" && (
        <div className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium",
          status === "error"
            ? "border-red-500/40 bg-red-500/10 text-red-400"
            : status === "done"
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            : "border-amber-500/40 bg-amber-500/10 text-amber-400"
        )}>
          {status === "done" ? (
            <CheckCircleIcon className="h-5 w-5 shrink-0" />
          ) : status === "error" ? (
            <XCircleIcon className="h-5 w-5 shrink-0" />
          ) : (
            <Loader2Icon className="h-5 w-5 animate-spin shrink-0" />
          )}
          <span>{status === "error" ? errorMsg : currentStep.label}</span>

          {/* Step indicators */}
          {busy && status !== "done" && (
            <div className="ml-auto flex items-center gap-1.5 text-xs">
              {(["uploading","transcribing","analyzing"] as Status[]).map((s, i) => (
                <span key={s} className={cn(
                  "px-2 py-0.5 rounded",
                  currentStep.step > i + 1
                    ? "text-emerald-400"
                    : currentStep.step === i + 1
                    ? "text-amber-400 font-semibold"
                    : "text-slate-600"
                )}>
                  {["① 上傳","② 轉錄","③ 分析"][i]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
