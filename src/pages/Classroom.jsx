import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageCircle, Clock, Circle, Send, Globe, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ReviewModal from "@/components/classroom/ReviewModal";

export default function Classroom() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const streamRef = useRef(null);

  useEffect(() => {
    loadLesson();
    startCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadLesson = async () => {
    try {
      const l = await base44.entities.Lesson.get(id);
      setLesson(l);
    } catch {} finally { setLoading(false); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {}
  };

  const toggleCamera = () => {
    if (streamRef.current) { streamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; }); setCameraOn(!cameraOn); }
  };
  const toggleMic = () => {
    if (streamRef.current) { streamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; }); setMicOn(!micOn); }
  };

  const sendMessage = () => {
    if (!msgInput.trim()) return;
    const msg = { text: msgInput, sender: "me", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages(prev => [...prev, msg]);
    setMsgInput("");
    setTimeout(() => {
      setMessages(prev => [...prev, { text: `[Translated] ${msgInput}`, sender: "system", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    }, 800);
  };

  const endLesson = async () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    try {
      await base44.entities.Lesson.update(id, {
        status: "completed", ended_at: new Date().toISOString(),
        duration_minutes: Math.round(elapsed / 60), is_recorded: isRecording,
      });
    } catch {}
    setShowReview(true);
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#05050f]">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#05050f] flex flex-col z-50">
      {/* HUD Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{user?.role === "tutor" ? lesson?.student_name : lesson?.tutor_name}</p>
            <p className="text-gray-500 text-xs capitalize">{lesson?.language} session</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white font-mono text-sm bg-white/8 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur">
            <Clock className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-violet-300">{formatTime(elapsed)}</span>
          </div>
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isRecording ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? "bg-red-400 animate-pulse" : "bg-gray-600"}`} />
            {isRecording ? "REC" : "Record"}
          </button>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Partner video placeholder */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Decorative glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-violet-600/5 blur-3xl pointer-events-none" />
          <div className="text-center relative z-10">
            <div className="w-28 h-28 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <Video className="w-12 h-12 text-gray-700" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Waiting for {user?.role === "tutor" ? "student" : "tutor"} to connect...</p>
            <p className="text-gray-700 text-xs mt-1">Your camera is active below</p>
          </div>
        </div>

        {/* Self video (PiP) */}
        <div className="absolute bottom-4 right-4 w-36 sm:w-48 aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
          {cameraOn ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-gray-700" />
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <div className="w-80 bg-black/60 backdrop-blur-xl border-l border-white/5 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2 text-white text-sm font-semibold">
                <Globe className="w-4 h-4 text-emerald-400" /> Chat + Translation
              </div>
              <button onClick={() => setChatOpen(false)} className="text-gray-600 hover:text-gray-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={m.sender === "me" ? "flex justify-end" : m.sender === "system" ? "flex justify-center" : "flex justify-start"}>
                  <div className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] ${
                    m.sender === "me" ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white" :
                    m.sender === "system" ? "bg-emerald-900/30 border border-emerald-500/20 text-emerald-400 text-xs italic" :
                    "bg-white/10 text-white"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-white/5">
              <div className="flex gap-2">
                <Input
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 text-sm"
                />
                <Button size="icon" onClick={sendMessage} className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating controls */}
      <div className="flex items-center justify-center gap-4 py-5 px-4 bg-black/40 backdrop-blur-xl border-t border-white/5">
        <button
          onClick={toggleMic}
          title={micOn ? "Mute" : "Unmute"}
          className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow-lg ${
            micOn ? "bg-white/10 hover:bg-white/15 text-white border border-white/10" : "bg-red-500/20 border border-red-500/40 text-red-400 shadow-red-500/20"
          }`}
          style={{ width: 52, height: 52 }}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleCamera}
          title={cameraOn ? "Stop camera" : "Start camera"}
          className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow-lg ${
            cameraOn ? "bg-white/10 hover:bg-white/15 text-white border border-white/10" : "bg-red-500/20 border border-red-500/40 text-red-400 shadow-red-500/20"
          }`}
          style={{ width: 52, height: 52 }}
        >
          {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow-lg ${
            chatOpen ? "bg-violet-500/20 border border-violet-500/40 text-violet-400 shadow-violet-500/20" : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
          }`}
          style={{ width: 52, height: 52 }}
        >
          <MessageCircle className="w-5 h-5" />
        </button>
        <button
          onClick={endLesson}
          className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow-xl shadow-red-500/30"
          style={{ width: 56, height: 52 }}
          title="End lesson"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {showReview && (
        <ReviewModal
          lesson={lesson} userRole={user?.role}
          onClose={() => { setShowReview(false); navigate("/my-lessons"); }}
        />
      )}
    </div>
  );
}