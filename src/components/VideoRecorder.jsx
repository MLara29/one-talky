import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Video, Square, Trash2, Play, Upload, Camera, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

// mode: "idle" | "preview_camera" | "recording" | "review" | "uploading" | "done"

export default function VideoRecorder({ onVideoReady, onVideoRemoved }) {
  const { toast } = useToast();
  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const [mode, setMode] = useState("idle"); // idle | preview_camera | recording | review | uploading | done
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setMode("preview_camera");
      // attach stream to video element after render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      toast({ title: "Câmera não encontrada", description: "Permita o acesso à câmera e microfone.", variant: "destructive" });
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: getSupportedMimeType() });
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      stopStream();
      setMode("review");
      clearInterval(timerRef.current);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setElapsed(0);
    setMode("recording");
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
  };

  const discardAndRetry = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
    setMode("idle");
    onVideoRemoved?.();
  };

  const uploadRecorded = async () => {
    if (!recordedBlob) return;
    setMode("uploading");
    try {
      const file = new File([recordedBlob], "intro_video.webm", { type: recordedBlob.type });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onVideoReady(file_url);
      setMode("done");
    } catch {
      toast({ title: "Falha no upload", description: "Tente novamente.", variant: "destructive" });
      setMode("review");
    }
  };

  // Upload from file picker
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMode("uploading");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onVideoReady(file_url);
      setMode("done");
    } catch {
      toast({ title: "Falha no upload", variant: "destructive" });
      setMode("idle");
    }
  };

  const getSupportedMimeType = () => {
    const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || "";
  };

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (mode === "done") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
          <Video className="w-4 h-4" /> Vídeo pronto para envio ✓
        </div>
        <button
          onClick={discardAndRetry}
          className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Remover
        </button>
      </div>
    );
  }

  if (mode === "uploading") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Enviando vídeo...</p>
      </div>
    );
  }

  if (mode === "review" && recordedUrl) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-400 font-medium">Revise seu vídeo</p>
        <video
          ref={previewRef}
          src={recordedUrl}
          controls
          className="w-full rounded-xl border border-white/10 bg-black max-h-48"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={discardAndRetry}
            className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
          >
            <Trash2 className="w-4 h-4 mr-1" /> Descartar e regravar
          </Button>
          <Button
            type="button"
            onClick={uploadRecorded}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Upload className="w-4 h-4 mr-1" /> Usar este vídeo
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "preview_camera" || mode === "recording") {
    return (
      <div className="space-y-3">
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black">
          <video ref={videoRef} muted className="w-full max-h-48 object-cover" />
          {mode === "recording" && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-xs font-mono">{fmt(elapsed)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {mode === "preview_camera" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => { stopStream(); setMode("idle"); }}
                className="flex-1 border-white/10 text-gray-300 bg-transparent hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={startRecording}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                <Video className="w-4 h-4 mr-1" /> Iniciar gravação
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={stopRecording}
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              <Square className="w-4 h-4 mr-1 fill-white" /> Parar gravação
            </Button>
          )}
        </div>
      </div>
    );
  }

  // idle
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Vídeo de apresentação (opcional) — 30 a 60 segundos</p>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={openCamera}
          variant="outline"
          className="flex-1 border-white/10 text-gray-300 bg-white/5 hover:bg-white/10 h-20 flex-col gap-1"
        >
          <Camera className="w-5 h-5" />
          <span className="text-xs">Gravar agora</span>
        </Button>
        <label className="flex-1 border border-dashed border-white/20 rounded-md h-20 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-white/5 transition-colors">
          <Upload className="w-5 h-5 text-gray-400" />
          <span className="text-xs text-gray-400">Fazer upload</span>
          <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>
    </div>
  );
}