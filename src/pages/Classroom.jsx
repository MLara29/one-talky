import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, MessageCircle, Clock, Circle,
  Send, Globe, X, Maximize, Minimize
} from "lucide-react";
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
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadLesson = async () => {
    try {
      const l = await base44.entities.Lesson.get(id);
      setLesson(l);
    } catch {} finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {}
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setCameraOn(!cameraOn);
    }
  };

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setMicOn(!micOn);
    }
  };

  const sendMessage = () => {
    if (!msgInput.trim()) return;
    const msg = { text: msgInput, sender: "me", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages(prev => [...prev, msg]);
    setMsgInput("");
    // Simulate translation
    setTimeout(() => {
      setMessages(prev => [...prev, {
        text: `[Translated] ${msgInput}`,
        sender: "system",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }]);
    }, 800);
  };

  const endLesson = async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      await base44.entities.Lesson.update(id, {
        status: "completed",
        ended_at: new Date().toISOString(),
        duration_minutes: Math.round(elapsed / 60),
        is_recorded: isRecording,
      });
    } catch {}
    setShowReview(true);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900">
        <div className="w-8 h-8 border-4 border-gray-600 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-400 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">
              {user?.role === "tutor" ? lesson?.student_name : lesson?.tutor_name}
            </p>
            <p className="text-gray-400 text-xs">{lesson?.language}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-white text-sm font-mono bg-white/10 px-3 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5" /> {formatTime(elapsed)}
          </div>
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              isRecording ? "bg-red-500/20 text-red-400" : "bg-white/10 text-gray-400"
            }`}
          >
            <Circle className={`w-2.5 h-2.5 ${isRecording ? "fill-red-400" : ""}`} />
            {isRecording ? "Recording" : "Record"}
          </button>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Main video (simulated partner) */}
        <div className="flex-1 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
              <Video className="w-10 h-10 text-gray-500" />
            </div>
            <p className="text-gray-400 text-sm">Waiting for {user?.role === "tutor" ? "student" : "tutor"} to connect...</p>
            <p className="text-gray-500 text-xs mt-1">Simulated session — video active on your end</p>
          </div>
        </div>

        {/* Self video (PiP) */}
        <div className="absolute bottom-4 right-4 w-36 h-48 sm:w-48 sm:h-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-700">
          {cameraOn ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-gray-600" />
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <div className="flex items-center gap-2 text-white text-sm font-medium">
                <Globe className="w-4 h-4 text-emerald-400" /> Chat with translation
              </div>
              <button onClick={() => setChatOpen(false)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`${m.sender === "me" ? "text-right" : m.sender === "system" ? "text-center" : "text-left"}`}>
                  <div className={`inline-block px-3 py-2 rounded-xl text-sm max-w-[85%] ${
                    m.sender === "me" ? "bg-violet-600 text-white" :
                    m.sender === "system" ? "bg-emerald-900/30 text-emerald-300 text-xs italic" :
                    "bg-gray-700 text-white"
                  }`}>
                    {m.text}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{m.time}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-700">
              <div className="flex gap-2">
                <Input
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-sm"
                />
                <Button size="icon" onClick={sendMessage} className="bg-violet-600 hover:bg-violet-700 text-white shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 py-4 px-4 bg-gray-900/80 backdrop-blur-lg">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            micOn ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-500 text-white"
          }`}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleCamera}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            cameraOn ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-500 text-white"
          }`}
        >
          {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            chatOpen ? "bg-violet-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-white"
          }`}
        >
          <MessageCircle className="w-5 h-5" />
        </button>
        <button
          onClick={endLesson}
          className="w-14 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {showReview && (
        <ReviewModal
          lesson={lesson}
          userRole={user?.role}
          onClose={() => { setShowReview(false); navigate("/my-lessons"); }}
        />
      )}
    </div>
  );
}