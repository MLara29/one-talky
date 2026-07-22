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
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [lessonEnding, setLessonEnding] = useState(false);
  // totalDurationMins: effective lesson duration = min(student_credits, scheduled_duration)
  const [totalDurationMins, setTotalDurationMins] = useState(null);
  const chatOpenRef = useRef(false);

  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localVideoDiv = useRef(null);
  const remoteVideoDiv = useRef(null);
  const chatBottomRef = useRef(null);
  const lessonRef = useRef(null);
  const totalDurationRef = useRef(null); // seconds
  const endingRef = useRef(false);
  const elapsedRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { lessonRef.current = lesson; }, [lesson]);
  useEffect(() => {
    if (totalDurationMins !== null) totalDurationRef.current = totalDurationMins * 60;
  }, [totalDurationMins]);

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

  // Main countdown timer — counts elapsed seconds and auto-ends when totalDuration is reached
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        elapsedRef.current = next;
        // Auto-end when the effective lesson duration expires
        if (totalDurationRef.current !== null && next >= totalDurationRef.current && !endingRef.current) {
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
        // Start lesson and notify tutor server-side
        await base44.functions.invoke('startLesson', { lesson_id: l.id });
      }
    } catch {}
  };

  const loadLesson = async () => {
    try {
      const l = await base44.entities.Lesson.get(id);
      setLesson(l);
      await notifyTutor(l);
      await joinChannel(l);

      // --- Determine effective lesson duration ---
      // 1. Fetch all scheduled lessons for this student+tutor pair to detect consecutive bookings
      // 2. Sum consecutive durations starting from this lesson's scheduled_at
      // 3. Effective duration = min(student_credits, total_scheduled_minutes)

      let scheduledMins = l.duration_minutes || 30; // default 30 if not set

      // Check for consecutive bookings (same tutor+student, scheduled back-to-back)
      try {
        const allLessons = await base44.entities.Lesson.filter({
          tutor_id: l.tutor_id,
          student_id: l.student_id,
          status: "scheduled",
        });
        if (allLessons.length > 1 && l.scheduled_at) {
          // Sort by scheduled_at
          const sorted = [...allLessons].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
          // Find this lesson's index
          const idx = sorted.findIndex(x => x.id === l.id);
          if (idx !== -1) {
            let total = sorted[idx].duration_minutes || 30;
            // Look forward: add consecutive lessons (gap ≤ 1 min)
            for (let i = idx + 1; i < sorted.length; i++) {
              const prev = sorted[i - 1];
              const curr = sorted[i];
              const prevEnd = new Date(prev.scheduled_at).getTime() + (prev.duration_minutes || 30) * 60000;
              const gap = new Date(curr.scheduled_at).getTime() - prevEnd;
              if (gap <= 60000) { // ≤ 1 minute gap = consecutive
                total += curr.duration_minutes || 30;
              } else break;
            }
            scheduledMins = total;
          }
        }
      } catch {}

      // Fetch student credits
      let studentCredits = scheduledMins; // default: assume enough credits
      try {
        const studentId = user?.role === "student" ? user.id : l.student_id;
        const profiles = await base44.entities.StudentProfile.filter({ user_id: studentId });
        if (profiles.length > 0) {
          studentCredits = profiles[0].credits_minutes ?? 0;
        }
      } catch {}

      // Effective duration: if student has enough credits, use full scheduled time; else use what's available
      const effectiveMins = Math.min(scheduledMins, studentCredits);
      setTotalDurationMins(effectiveMins);
      totalDurationRef.current = effectiveMins * 60;

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

    try {
      // All lesson finalization (status, student credits, tutor earnings) handled server-side
      await base44.functions.invoke('endLesson', { lesson_id: id, is_recorded: isRecording });
    } catch {}

    setShowReview(true);
  };

  const formatTime = (s) => {
    const totalSecs = Math.max(0, Math.round(s));
    return `${Math.floor(totalSecs / 60).toString().padStart(2, "0")}:${(totalSecs % 60).toString().padStart(2, "0")}`;
  };

  // Countdown remaining seconds for both student and tutor
  const remainingSeconds = totalDurationMins !== null
    ? Math.max(0, totalDurationMins * 60 - elapsed)
    : null;

  // Minutes remaining (for warning and display)
  const minsRemaining = remainingSeconds !== null ? remainingSeconds / 60 : null;

  // Show warning when ≤ 2 minutes left
  useEffect(() => {
    if (remainingSeconds === null) return;
    if (remainingSeconds <= 120 && remainingSeconds > 0 && !showCreditWarning) {
      setShowCreditWarning(true);
    }
    if (remainingSeconds <= 0 && !endingRef.current) {
      endLesson();
    }
  }, [Math.floor(remainingSeconds ?? 999)]);

  // Display: always countdown (for both student and tutor)
  const displaySeconds = remainingSeconds !== null ? remainingSeconds : elapsed;

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50">
      {/* Credit warning banner */}
      {showCreditWarning && minsRemaining !== null && minsRemaining > 0 && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-amber-500/20 border-b border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            Atenção: apenas {Math.ceil(minsRemaining)} minuto{Math.ceil(minsRemaining) !== 1 ? "s" : ""} restante{Math.ceil(minsRemaining) !== 1 ? "s" : ""} na aula!
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
            minsRemaining !== null && minsRemaining <= 2
              ? "bg-red-100 border-red-300 text-red-600"
              : "bg-gray-100 border-gray-200 text-gray-700"
          }`}>
            <Clock className="w-3.5 h-3.5 text-violet-500" />
            <span className="font-semibold">{formatTime(displaySeconds)}</span>
            <span className="text-xs text-gray-400 ml-1">restante</span>
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
          onClose={() => {
            setShowReview(false);
            navigate(user?.role === "student" ? "/" : "/my-lessons");
          }}
        />
      )}
    </div>
  );
}