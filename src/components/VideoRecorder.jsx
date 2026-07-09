import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Video, Square, Trash2, Upload, Camera } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function VideoRecorder({ onVideoReady, onVideoRemoved }) {
  const { toast } = useToast();

  // refs
  const liveVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // state
  const [mode, setMode] = useState("idle"); // idle | camera | recording | review | uploading | done
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    return () => {
      stopStream();
      clearInterval(timerRef.current);
    };
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // Attach live stream to video element whenever we enter camera/recording mode
  useEffect(() => {
    if ((mode === "camera" || mode === "recording") && liveVideoRef.current && streamRef.current) {
      liveVideoRef.current.srcObject = streamRef.current;
      liveVideoRef.current.play().catch(() => {});
    }
  }, [mode]);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setMode("camera");
    } catch {
      toast({ title: "Câmera não encontrada", description: "Permita o acesso à câmera e microfone.", variant: "destructive" });
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    // pick best supported mime
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      .find(t => MediaRecorder.isTypeSupported(t)) || "";

    const mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});

    // timeslice=250ms ensures chunks arrive frequently (fixes empty blob on some browsers)
    mr.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      clearInterval(timerRef.current);
      stopStream();
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setMode("review");
    };

    mr.start(250); // collect data every 250ms
    mediaRecorderRef.current = mr;
    setElapsed(0);
    setMode("recording");
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
  };

  const discard = () => {
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
      const ext = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([recordedBlob], `intro.${ext}`, { type: recordedBlob.type });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      onVideoReady(file_url);
      setMode("done");
    } catch {
      toast({ title: "Falha no upload", description: "Tente novamente.", variant: "destructive" });
      setMode("review");
    }
  };

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

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── DONE ──
  if (mode === "done") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
        <span className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
          <Video className="w-4 h-4" /> Vídeo enviado com sucesso ✓
        </span>
        <button type="button" onClick={discard} className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors">
          <Trash2 className="w-3 h-3" /> Remover
        </button>
      </div>
    );
  }

  // ── UPLOADING ──
  if (mode === "uploading") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Enviando vídeo...</p>
      </div>
    );
  }

  // ── REVIEW ──
  if (mode === "review") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-300 font-medium">Revise seu vídeo antes de enviar</p>
        {recordedUrl ? (
          <video
            key={recordedUrl}
            src={recordedUrl}
            controls
            playsInline
            className="w-full rounded-xl border border-white/10 bg-black"
            style={{ maxHeight: "220px" }}
          />
        ) : (
          <p className="text-xs text-red-400">Erro ao gerar preview do vídeo.</p>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={discard}
            className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent">
            <Trash2 className="w-4 h-4 mr-1" /> Descartar e regravar
          </Button>
          <Button type="button" onClick={uploadRecorded}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">
            <Upload className="w-4 h-4 mr-1" /> Usar este vídeo
          </Button>
        </div>
      </div>
    );
  }

  // ── CAMERA / RECORDING ──
  if (mode === "camera" || mode === "recording") {
    return (
      <div className="space-y-3">
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black" style={{ minHeight: "180px" }}>
          <video ref={liveVideoRef} muted playsInline className="w-full object-cover" style={{ maxHeight: "220px" }} />
          {mode === "recording" && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 rounded-full px-2.5 py-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-xs font-mono">{fmt(elapsed)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {mode === "camera" ? (
            <>
              <Button type="button" variant="outline" onClick={() => { stopStream(); setMode("idle"); }}
                className="flex-1 border-white/10 text-gray-300 bg-transparent hover:bg-white/5">
                Cancelar
              </Button>
              <Button type="button" onClick={startRecording}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                <Video className="w-4 h-4 mr-1" /> Iniciar gravação
              </Button>
            </>
          ) : (
            <Button type="button" onClick={stopRecording}
              className="w-full bg-red-600 hover:bg-red-700 text-white">
              <Square className="w-4 h-4 mr-1 fill-white" /> Parar gravação
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── IDLE ──
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">Vídeo de apresentação (opcional) — 30 a 60 segundos</p>
      <div className="flex gap-2">
        <Button type="button" onClick={openCamera} variant="outline"
          className="flex-1 border-white/10 text-gray-300 bg-white/5 hover:bg-white/10 h-20 flex-col gap-1">
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