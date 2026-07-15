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
  const [showReview, setShowReview] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState(null);
  const [joined, setJoined] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [creditsLeft, setCreditsLeft] = useState(null); // minutes remaining for student
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

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
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

  // Credit warning & auto-end for student
  useEffect(() => {
    if (user?.role !== "student" || creditsLeft === null) return;
    if (creditsLeft <= 2 && creditsLeft > 0) {
      setShowCreditWarning(true);
    }
    if (creditsLeft <= 0 && !endingRef.current) {
      endLesson();
    }
  }, [creditsLeft]);

  // Decrement student credits every minute
  useEffect(() => {
    if (user?.role !== "student") return;
    const interval = setInterval(() => {
      setCreditsLeft(prev => {
        if (prev === null) return null;
        return Math.max(0, prev - 1);
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [user?.role]);

  // Real-time chat via entity subscription
  useEffect(() => {
    // Load existing messages
    base44.entities.ClassroomMessage.filter({ lesson_id: id }, "created_date", 100)
      .then(msgs => setMessages(msgs))
      .catch(() => {});

    const unsubscribe = base44.entities.ClassroomMessage.subscribe((event) => {
      if (event.data?.lesson_id !== id) return;
      if (event.type === "create") {
        setMessages(prev => {
          if (prev.find(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
        if (event.data.sender_id !== user?.id) {
          setChatOpen(open => {
            if (!open) setUnreadCount(c => c + 1);
            return open;
          });
        }
      }
    });
    return unsubscribe;
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

      // Load student credits
      if (user?.role === "student") {
        const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          setCreditsLeft(profiles[0].credits_minutes ?? 0);
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

    const { token, appId } = await fetchAgoraToken(channelName, uid);
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
    await base44.entities.ClassroomMessage.create({
      lesson_id: id,
      sender_id: user.id,
      sender_name: user.full_name || user.email || "You",
      text,
    });
  };

  const endLesson = async () => {
    if (endingRef.current || lessonEnding) return;
    endingRef.current = true;
    setLessonEnding(true);

    await leaveChannel();
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));
    const currentLesson = lessonRef.current;

    try {
      // Mark lesson completed — this signals the other party to also leave
      await base44.entities.Lesson.update(id, {
        status: "completed",
        ended_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
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
            credits_minutes: newCredits,
            total_minutes: (profile.total_minutes ?? 0) + durationMinutes,
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
          await base44.entities.TutorProfile.update(tp.id, {
            total_earnings: (tp.total_earnings ?? 0) + durationMinutes * rate,
            total_minutes: (tp.total_minutes ?? 0) + durationMinutes,
            total_lessons: (tp.total_lessons ?? 0) + 1,
          });
        }
      } catch {}
    }

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
      {/* Credit warning banner */}
      {showCreditWarning && creditsLeft !== null && creditsLeft > 0 && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-amber-500/20 border-b border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            Atenção: apenas {creditsLeft} minuto{creditsLeft !== 1 ? "s" : ""} restante{creditsLeft !== 1 ? "s" : ""} no seu plano!
          </div>
          <button onClick={() => setShowCreditWarning(false)} className="text-amber-400/70 hover:text-amber-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">
              {user?.role === "tutor" ? lesson?.student_name : lesson?.tutor_name}
            </p>
            <p className="text-gray-500 text-xs capitalize">{lesson?.language} session</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white font-mono text-sm bg-white/8 border border-white/10 px-3 py-1.5 rounded-xl backdrop-blur">
            <Clock className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-violet-300">{formatTime(elapsed)}</span>
          </div>
          {user?.role === "student" && creditsLeft !== null && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              creditsLeft <= 2 ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-white/5 border-white/10 text-gray-400"
            }`}>
              <Clock className="w-3 h-3" />
              {creditsLeft} min
            </div>
          )}
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
          <div className="absolute top-0 right-0 bottom-0 w-72 sm:w-80 bg-black/80 backdrop-blur-xl border-l border-white/5 flex flex-col z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2 text-white text-sm font-semibold">
                <Globe className="w-4 h-4 text-emerald-400" /> Chat
              </div>
              <button onClick={() => setChatOpen(false)} className="text-gray-600 hover:text-gray-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m, i) => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id || i} className={isMe ? "flex justify-end" : "flex justify-start"}>
                    <div className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] ${
                      isMe
                        ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                        : "bg-white/10 text-white"
                    }`}>
                      {!isMe && <p className="text-xs text-gray-400 mb-0.5">{m.sender_name?.split("@")[0]}</p>}
                      {m.text}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="text-gray-700 text-xs text-center mt-4">No messages yet</p>
              )}
              <div ref={chatBottomRef} />
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

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-5 px-4 bg-black/40 backdrop-blur-xl border-t border-white/5">
        <button
          onClick={toggleMic}
          className={`rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow-lg ${
            micOn ? "bg-white/10 hover:bg-white/15 text-white border border-white/10" : "bg-red-500/20 border border-red-500/40 text-red-400 shadow-red-500/20"
          }`}
          style={{ width: 52, height: 52 }}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleCamera}
          className={`rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow-lg ${
            cameraOn ? "bg-white/10 hover:bg-white/15 text-white border border-white/10" : "bg-red-500/20 border border-red-500/40 text-red-400 shadow-red-500/20"
          }`}
          style={{ width: 52, height: 52 }}
        >
          {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button
          onClick={() => { setChatOpen(o => !o); setUnreadCount(0); }}
          className={`relative rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow-lg ${
            chatOpen ? "bg-violet-500/20 border border-violet-500/40 text-violet-400 shadow-violet-500/20" : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
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