import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Video, Square, RotateCcw, Check, X } from "lucide-react";

export default function VideoRecorderModal({ onSave, onClose }) {
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [error, setError] = useState("");
  const liveVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    let active = true;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(s => {
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(s);
        if (liveVideoRef.current) liveVideoRef.current.srcObject = s;
      })
      .catch(() => setError("Could not access camera/microphone. Check browser permissions."));

    return () => {
      active = false;
      // Sempre libera a câmera ao fechar o modal, mesmo sem salvar
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startRecording = () => {
    chunksRef.current = [];
    const mimeType = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ].find(t => MediaRecorder.isTypeSupported(t)) || "";
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    recorder.ondataavailable = e => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      setRecordedBlob(blob);
    };
    recorder.start(250); // captura dados a cada 250ms, evita blob vazio em alguns navegadores
    mediaRecorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const retake = () => {
    setRecordedBlob(null);
    chunksRef.current = [];
  };

  const useThisVideo = () => {
    const actualType = recordedBlob?.type || "video/webm";
    const ext = actualType.includes("mp4") ? "mp4" : "webm";
    const file = new File([recordedBlob], `intro-video-${Date.now()}.${ext}`, { type: actualType });
    stream?.getTracks().forEach(t => t.stop());
    onSave(file);
  };

  const handleClose = () => {
    stream?.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Record intro video</h3>
          <button onClick={handleClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        {!recordedBlob ? (
          <>
            <video ref={liveVideoRef} autoPlay muted playsInline className="w-full rounded-xl bg-black" style={{ maxHeight: 300 }} />
            <div className="flex justify-center mt-4">
              {!recording ? (
                <Button onClick={startRecording} disabled={!stream} className="bg-red-500 hover:bg-red-600">
                  <Video className="w-4 h-4 mr-2" /> Start recording
                </Button>
              ) : (
                <Button onClick={stopRecording} className="bg-gray-800 hover:bg-gray-900">
                  <Square className="w-4 h-4 mr-2" /> Stop recording
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <video ref={previewVideoRef} src={URL.createObjectURL(recordedBlob)} controls className="w-full rounded-xl bg-black" style={{ maxHeight: 300 }} />
            <div className="flex gap-2 mt-4">
              <Button onClick={retake} variant="outline" className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" /> Retake
              </Button>
              <Button onClick={useThisVideo} className="flex-1 bg-orange-500 hover:bg-orange-600">
                <Check className="w-4 h-4 mr-2" /> Use this video
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}