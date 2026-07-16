import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageCircle, Clock, Send, Globe, X, User, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ReviewModal from "@/components/classroom/ReviewModal";
import AgoraRTC from "agora-rtc-sdk-ng";


export default function Classroom() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [initialCredits, setInitialCredits] = useState(null); // minutos iniciais do aluno para countdown
  const [showReview, setShowReview] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState(null);
  const [joined, setJoined] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [creditsLeft, setCreditsLeft] = useState(null); // minutes remaining for student
  const chatOpenRef = useRef(false);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [lessonEnding, setLessonEnding] = useState(false);

  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localVideoDiv = useRef(null);
  const remoteVideoDiv = useRef(null);
  const chatBottomRef = useRef(null);
  const lessonRef = useRef(null);
  const creditsLeftRef = useRef(null);
  const endingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { lessonRef.current = lesson; }, [lesson]);
  useEffect(() => { creditsLeftRef.current = creditsLeft; }, [creditsLeft]);

  // Play remote video
  useEffect(() => {
    if (remoteVideoTrack && remoteVideoDiv.current) {
      remoteVideoTrack.play(remoteVideoDiv.current);
    }
  }, [remoteVideoTrack]);

  // Play local video
  useEffect(() => {
    if (joined && cameraOn && localVideoTrackRef.current && localVideoDiv.current) {
      localVideoTrackRef.current.play(localVideoDiv.current);
    }
  }, [joined, cameraOn]);

  useEffect(() => {
    loadLesson();
    return () => leaveChannel();
  }, [id]);

  // Timer crescente (usado para calcular duração e earnings)
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        // Limite máximo de 60 minutos — encerra automaticamente
        if (next >= 3600 && !endingRef.current) {
          endLesson();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll for remote lesson end (when the other party ends the call)
  useEffect(() => {
    const poll = setInterval(async () => {
      if (endingRef.current) return;
      try {
        const l = await base44.entities.Lesson.get(id);
        if (l.status === "completed") {
          endingRef.current = true;
          clearInterval(poll);
          await leaveChannel();
          setShowReview(true);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(poll);
  }, [id]);

  // Credit warning & auto-end for student (creditsLeft em minutos)
  useEffect(() => {
    if (user?.role !== "student" || creditsLeft === null) return;
    if (creditsLeft <= 2 && creditsLeft > 0) {
      setShowCreditWarning(true);
    }
    if (creditsLeft <= 0 && !endingRef.current) {
      endLesson();
    }
  }, [Math.floor(creditsLeft)]);

  // Decrement student credits every second (exibição em segundos → convertido para minutos)
  useEffect(() => {
    if (user?.role !== "student") return;
    const interval = setInterval(() => {
      setCreditsLeft(prev => {
        if (prev === null) return null;
        return Math.max(0, prev - (1 / 60));
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [user?.role]);

  // Poll every 2s using service-role backend function to bypass RLS
  const seenMsgIds = useRef(new Set());
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await base44.functions.invoke('getClassroomMessages', { lesson_id: id });
        const msgs = res.data?.messages || [];
        msgs.forEach(m => {
          if (seenMsgIds.current.has(m.id)) return;
          seenMsgIds.current.add(m.id);
          if (m.sender_id === user?.id) return; // skip own (already shown optimistically)
          setMessages(prev => [...prev, {
            id: m.id,
            sender_id: m.sender_id,
            sender_name: m.sender_name,
            text: m.text,
            ts: new Date(m.created_date).getTime(),
          }]);
          if (!chatOpenRef.current) setUnreadCount(c => c + 1);
        });
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [id, user?.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const notifyTutor = async (l) => {
    try {
      if (user?.role !== "tutor") {
        await base44.entities.Notification.create({
          user_id: l.tutor_id,
          title: "📞 Aula ao vivo iniciada!",
          message: `${l.student_name} está aguardando você na aula de ${l.language}. Entre agora!`,
          type: "lesson_booked",
          link: `/classroom/${l.id}`,
          is_read: false,
        });
        await base44.entities.Lesson.update(l.id, { status: "in_progress", started_at: new Date().toISOString() });
      }
    } catch {}
  };

  const loadLesson = async () => {
    try {
      const l = await base44.entities.Lesson.get(id);
      setLesson(l);
      await notifyTutor(l);
      await joinChannel(l);

      // Load student credits — usado para countdown e limite de 60min
      if (user?.role === "student") {
        const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          const mins = Math.min(profiles[0].credits_minutes ?? 0, 60); // máximo 60 min por chamada
          setCreditsLeft(mins);
          setInitialCredits(mins);
        }
      }
    } catch (e) {
      console.error("Classroom error:", e);
      toast({ title: "Erro ao carregar aula", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchAgoraToken = async (channelName, uid) => {
    const res = await base44.functions.invoke('agoraToken', { channelName, uid, role: 'publisher' });
    if (!res.data?.token) throw new Error("Falha ao gerar token Agora");
    return res.data;
  };

  const joinChannel = async (l) => {
    // --- RTC ---
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    client.on("user-published", async (remoteAgoraUser, mediaType) => {
      await client.subscribe(remoteAgoraUser, mediaType);
      if (mediaType === "video" && remoteAgoraUser.videoTrack) {
        setRemoteVideoTrack(remoteAgoraUser.videoTrack);
      }
      if (mediaType === "audio" && remoteAgoraUser.audioTrack) {
        remoteAgoraUser.audioTrack.play();
      }
    });

    client.on("user-unpublished", (_, mediaType) => {
      if (mediaType === "video") setRemoteVideoTrack(null);
    });

    client.on("user-left", () => setRemoteVideoTrack(null));

    const uid = (l.tutor_id === user?.id) ? 1 : 2;
    const channelName = id;

    const { token, rtmToken, rtmUserId, appId } = await fetchAgoraToken(channelName, uid);
    if (!appId) throw new Error("App ID do Agora não configurado");

    client.on("token-privilege-will-expire", async () => {
      const { token: newToken } = await fetchAgoraToken(channelName, uid);
      await client.renewToken(newToken);
    });

    await client.join(appId, channelName, token, uid);

    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    localAudioTrackRef.current = audioTrack;
    localVideoTrackRef.current = videoTrack;

    await client.publish([audioTrack, videoTrack]);
    setJoined(true);

    const playLocal = () => {
      if (localVideoDiv.current) {
        videoTrack.play(localVideoDiv.current);
      } else {
        setTimeout(playLocal, 200);
      }
    };
    playLocal();

    // RTM is unreliable (clock skew causes Error Code 6 on Deno runtime).
    // Chat uses DB + realtime subscribe as primary channel — fast and reliable.
    console.log("[Chat] using DB realtime as primary chat channel");
  };

  const leaveChannel = async () => {
    localAudioTrackRef.current?.close();
    localVideoTrackRef.current?.close();
    await clientRef.current?.leave();
  };

  const toggleCamera = async () => {
    if (localVideoTrackRef.current) {
      await localVideoTrackRef.current.setEnabled(!cameraOn);
      setCameraOn(prev => !prev);
    }
  };

  const toggleMic = async () => {
    if (localAudioTrackRef.current) {
      await localAudioTrackRef.current.setEnabled(!micOn);
      setMicOn(prev => !prev);
    }
  };

  const sendMessage = async () => {
    if (!msgInput.trim()) return;
    const text = msgInput.trim();
    setMsgInput("");
    // Use display name from StudentProfile/TutorProfile if available, else full_name from auth, else email
    let senderName = user.full_name || user.email || "You";
    try {
      if (user.role === "student") {
        const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
        if (profiles.length > 0 && profiles[0].full_name) senderName = profiles[0].full_name;
      } else if (user.role === "tutor") {
        const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
        if (profiles.length > 0 && profiles[0].full_name) senderName = profiles[0].full_name;
      }
    } catch {}

    // Optimistic local update
    setMessages(prev => [...prev, {
      id: `local-${Date.now()}`,
      sender_id: user.id,
      sender_name: senderName,
      text,
      ts: Date.now(),
    }]);

    // Save to DB — the other party receives it via realtime subscribe
    try {
      await base44.entities.ClassroomMessage.create({
        lesson_id: id,
        sender_id: user.id,
        sender_name: senderName,
        text,
      });
    } catch (e) {
      console.error("[Chat] sendMessage error:", e);
    }
  };

  const endLesson = async () => {
    if (endingRef.current || lessonEnding) return;
    endingRef.current = true;
    setLessonEnding(true);

    await leaveChannel();
    const durationSeconds = Math.max(1, elapsed);
    const durationMinutes = durationSeconds / 60; // proportional, not rounded
    const currentLesson = lessonRef.current;

    try {
      // Mark lesson completed — this signals the other party to also leave
      await base44.entities.Lesson.update(id, {
        status: "completed",
        ended_at: new Date().toISOString(),
        duration_minutes: Math.round(durationMinutes),
        is_recorded: isRecording,
      });
    } catch {}

    if (currentLesson?.student_id) {
      try {
        const profiles = await base44.entities.StudentProfile.filter({ user_id: currentLesson.student_id });
        if (profiles.length > 0) {
          const profile = profiles[0];
          const newCredits = Math.max(0, (profile.credits_minutes ?? 0) - durationMinutes);
          await base44.entities.StudentProfile.update(profile.id, {
            credits_minutes: Math.round(newCredits * 100) / 100,
            total_minutes: Math.round(((profile.total_minutes ?? 0) + durationMinutes) * 100) / 100,
            total_lessons: (profile.total_lessons ?? 0) + 1,
            last_practice_date: new Date().toISOString().split("T")[0],
          });
        }
      } catch {}
    }

    if (currentLesson?.tutor_id) {
      try {
        const tutorProfiles = await base44.entities.TutorProfile.filter({ user_id: currentLesson.tutor_id });
        if (tutorProfiles.length > 0) {
          const tp = tutorProfiles[0];
          const rate = tp.price_per_minute ?? 0.9967;
          const earningsSecs = durationSeconds * (rate / 60); // rate per second
          await base44.entities.TutorProfile.update(tp.id, {
            total_earnings: Math.round(((tp.total_earnings ?? 0) + earningsSecs) * 100) / 100,
            total_minutes: Math.round(((tp.total_minutes ?? 0) + durationMinutes) * 100) / 100,
            total_lessons: (tp.total_lessons ?? 0) + 1,
          });
        }
      } catch {}
    }

    setShowReview(true);
  };

  const formatTime = (s) => {
    const totalSecs = Math.max(0, Math.round(s));
    return `${Math.floor(totalSecs / 60).toString().padStart(2, "0")}:${(totalSecs % 60).toString().padStart(2, "0")}`;
  };

  // Para aluno: countdown baseado nos créditos restantes (em segundos)
  // Para tutor: elapsed crescente
  const displaySeconds = user?.role === "student" && creditsLeft !== null
    ? creditsLeft * 60  // creditsLeft em minutos → segundos
    : elapsed;

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50">
      {/* Credit warning banner */}
      {showCreditWarning && creditsLeft !== null && creditsLeft > 0 && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-amber-500/20 border-b border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            Atenção: apenas {Math.ceil(creditsLeft)} minuto{Math.ceil(creditsLeft) !== 1 ? "s" : ""} restante{Math.ceil(creditsLeft) !== 1 ? "s" : ""} na sua aula!
          </div>
          <button onClick={() => setShowCreditWarning(false)} className="text-amber-400/70 hover:text-amber-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-gray-900 text-sm font-semibold">
              {user?.role === "tutor" ? lesson?.student_name : lesson?.tutor_name}
            </p>
            <p className="text-gray-500 text-xs capitalize">{lesson?.language} session</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 font-mono text-sm px-3 py-1.5 rounded-xl border ${
            user?.role === "student" && creditsLeft !== null && creditsLeft <= 2
              ? "bg-red-100 border-red-300 text-red-600"
              : "bg-gray-100 border-gray-200 text-gray-700"
          }`}>
            <Clock className="w-3.5 h-3.5 text-violet-500" />
            <span className="font-semibold">{formatTime(displaySeconds)}</span>
            {user?.role === "student" && <span className="text-xs text-gray-400 ml-1">restante</span>}
          </div>
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isRecording ? "bg-red-100 border-red-300 text-red-600" : "bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRecording ? "bg-red-400 animate-pulse" : "bg-gray-600"}`} />
            {isRecording ? "REC" : "Record"}
          </button>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Remote video (main) */}
        <div className="flex-1 relative bg-black">
          <div
            ref={remoteVideoDiv}
            className="w-full h-full"
            style={{ display: remoteVideoTrack ? "block" : "none" }}
          />
          {!remoteVideoTrack && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-violet-600/5 blur-3xl pointer-events-none" />
              <div className="text-center relative z-10">
                <div className="w-28 h-28 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                  <User className="w-12 h-12 text-gray-700" />
                </div>
                <p className="text-gray-500 text-sm font-medium">
                  Waiting for {user?.role === "tutor" ? "student" : "tutor"} to connect...
                </p>
                {joined && <p className="text-emerald-500 text-xs mt-1">✓ You're connected to the channel</p>}
              </div>
            </div>
          )}
        </div>

        {/* Local video (PiP) */}
        <div className="absolute bottom-4 right-4 w-36 sm:w-48 aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
          <div
            ref={localVideoDiv}
            className="w-full h-full"
            style={{ display: cameraOn ? "block" : "none" }}
          />
          {!cameraOn && (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-gray-700" />
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-72 sm:w-80 bg-white border-l border-gray-200 flex flex-col z-10 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-800 text-sm font-semibold">
                <Globe className="w-4 h-4 text-emerald-500" /> Chat
              </div>
              <button onClick={() => { chatOpenRef.current = false; setChatOpen(false); }} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
              {messages.map((m, i) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id || i} className={isMe ? "flex justify-end" : "flex justify-start"}>
                    <div className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] ${
                      isMe
                        ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}>
                      {!isMe && <p className="text-xs text-gray-400 mb-0.5">{m.sender_name?.split("@")[0]}</p>}
                      {m.text}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="text-gray-400 text-xs text-center mt-4">No messages yet</p>
              )}
              <div ref={chatBottomRef} />
            </div>
            <div className="p-3 border-t border-gray-100 bg-white">
              <div className="flex gap-2">
                <Input
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 text-sm"
                />
                <Button size="icon" onClick={sendMessage} className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-0 shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-5 px-4 bg-white border-t border-gray-200">
        <button
          onClick={toggleMic}
          className={`rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow ${
            micOn ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200" : "bg-red-100 border border-red-300 text-red-600"
          }`}
          style={{ width: 52, height: 52 }}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleCamera}
          className={`rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow ${
            cameraOn ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200" : "bg-red-100 border border-red-300 text-red-600"
          }`}
          style={{ width: 52, height: 52 }}
        >
          {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button
          onClick={() => { const next = !chatOpenRef.current; chatOpenRef.current = next; setChatOpen(next); if (next) setUnreadCount(0); }}
          className={`relative rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow ${
            chatOpen ? "bg-violet-100 border border-violet-300 text-violet-600" : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
          }`}
          style={{ width: 52, height: 52 }}
        >
          <MessageCircle className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={endLesson}
          disabled={lessonEnding}
          className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow-xl shadow-red-500/30 disabled:opacity-50"
          style={{ width: 56, height: 52 }}
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