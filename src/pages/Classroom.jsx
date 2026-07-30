import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageCircle, Clock, Send, Globe, X, User, AlertTriangle, Monitor, MonitorOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ReviewModal from "@/components/classroom/ReviewModal";
import LessonReminderPopup from "@/components/LessonReminderPopup";
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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  // Received by student: true when tutor is sharing screen
  const [remoteIsScreenSharing, setRemoteIsScreenSharing] = useState(false);
  const [totalDurationMins, setTotalDurationMins] = useState(null);
  const chatOpenRef = useRef(false);

  const clientRef = useRef(null);
  const reconcileRef = useRef(null);
  const joinGuardRef = useRef(false);
  const autoToggleRef = useRef(false);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const screenVideoTrackRef = useRef(null);
  const screenAudioTrackRef = useRef(null);
  const localVideoDiv = useRef(null);
  const remoteVideoDiv = useRef(null);
  const chatBottomRef = useRef(null);
  const lessonRef = useRef(null);
  const totalDurationRef = useRef(null);
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

  // Main countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        elapsedRef.current = next;
        if (totalDurationRef.current !== null && next >= totalDurationRef.current && !endingRef.current) {
          endLesson();
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll for remote lesson end
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

  // Chat + screen-share signal poller
  const seenMsgIds = useRef(new Set());
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await base44.functions.invoke('getClassroomMessages', { lesson_id: id });
        const msgs = res.data?.messages || [];
        msgs.forEach(m => {
          if (seenMsgIds.current.has(m.id)) return;
          seenMsgIds.current.add(m.id);
          // System signal: screen share state from tutor
          if (m.text?.startsWith("__SCREEN_SHARE:")) {
            setRemoteIsScreenSharing(m.text === "__SCREEN_SHARE:true");
            return;
          }
          if (m.sender_id === user?.id) return;
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

      let scheduledMins = l.duration_minutes || 30;

      try {
        const allLessons = await base44.entities.Lesson.filter({
          tutor_id: l.tutor_id,
          student_id: l.student_id,
          status: "scheduled",
        });
        if (allLessons.length > 1 && l.scheduled_at) {
          const sorted = [...allLessons].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
          const idx = sorted.findIndex(x => x.id === l.id);
          if (idx !== -1) {
            let total = sorted[idx].duration_minutes || 30;
            for (let i = idx + 1; i < sorted.length; i++) {
              const prev = sorted[i - 1];
              const curr = sorted[i];
              const prevEnd = new Date(prev.scheduled_at).getTime() + (prev.duration_minutes || 30) * 60000;
              const gap = new Date(curr.scheduled_at).getTime() - prevEnd;
              if (gap <= 60000) { total += curr.duration_minutes || 30; } else break;
            }
            scheduledMins = total;
          }
        }
      } catch {}

      let studentCredits = scheduledMins;
      try {
        const studentId = user?.role === "student" ? user.id : l.student_id;
        const profiles = await base44.entities.StudentProfile.filter({ user_id: studentId });
        if (profiles.length > 0) {
          studentCredits = profiles[0].credits_minutes ?? 0;
        }
      } catch {}

      const effectiveMins = Math.min(scheduledMins, studentCredits);
      setTotalDurationMins(effectiveMins);
      totalDurationRef.current = effectiveMins * 60;

    } catch (e) {
      console.error("[Classroom] loadLesson error:", e);
      toast({ title: "Erro ao carregar aula", description: "Não foi possível carregar a aula. Verifique sua conexão e tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchAgoraToken = async (channelName, uid) => {
    const res = await base44.functions.invoke('agoraToken', { channelName, uid, role: 'publisher' });
    if (!res.data?.token) throw new Error("Falha ao gerar token Agora");
    return res.data;
  };

  // Deterministic unique Agora UID per user — avoids collisions between
  // participants (including when the same person holds two roles)
  const uidFromUserId = (userId) => {
    let h = 0;
    for (let i = 0; i < String(userId).length; i++) {
      h = (h * 31 + String(userId).charCodeAt(i)) % 2000000000;
    }
    return h || 1;
  };

  const joinChannel = async (l) => {
    if (joinGuardRef.current) return;
    joinGuardRef.current = true;

    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    client.on("user-published", async (remoteAgoraUser, mediaType) => {
      try {
        await client.subscribe(remoteAgoraUser, mediaType);
        if (mediaType === "video" && remoteAgoraUser.videoTrack) {
          setRemoteVideoTrack(remoteAgoraUser.videoTrack);
        }
        if (mediaType === "audio" && remoteAgoraUser.audioTrack) {
          remoteAgoraUser.audioTrack.play();
        }
      } catch (e) {
        console.error("[Agora] subscribe failed:", e);
      }
    });

    client.on("user-unpublished", (_, mediaType) => {
      if (mediaType === "video") setRemoteVideoTrack(null);
    });

    client.on("user-left", () => setRemoteVideoTrack(null));

    const uid = uidFromUserId(user?.id);
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

    // Reconciliation: the "user-published" event is missed when the other side
    // published before we finished joining. Re-check the channel periodically.
    const reconcile = async () => {
      for (const remoteUser of client.remoteUsers) {
        try {
          if (remoteUser.hasVideo && !remoteUser.videoTrack) {
            await client.subscribe(remoteUser, "video");
          }
          if (remoteUser.videoTrack) {
            setRemoteVideoTrack(prev => (prev === remoteUser.videoTrack ? prev : remoteUser.videoTrack));
          }
          if (remoteUser.hasAudio && !remoteUser.audioTrack) {
            await client.subscribe(remoteUser, "audio");
            remoteUser.audioTrack?.play();
          }
        } catch (e) {
          console.error("[Agora] reconcile failed:", e);
        }
      }

      // Once the other participant is in the room, the student's camera is
      // automatically toggled off/on so the tutor always receives the video.
      if (
        user?.role !== "tutor" &&
        client.remoteUsers.length > 0 &&
        !autoToggleRef.current &&
        localVideoTrackRef.current
      ) {
        autoToggleRef.current = true;
        try {
          await localVideoTrackRef.current.setEnabled(false);
          setCameraOn(false);
          await new Promise(r => setTimeout(r, 700));
          await localVideoTrackRef.current.setEnabled(true);
          setCameraOn(true);
          if (localVideoDiv.current) localVideoTrackRef.current.play(localVideoDiv.current);
        } catch (e) {
          console.error("[Agora] auto camera toggle failed:", e);
        }
      }
    };
    reconcile();
    reconcileRef.current = setInterval(reconcile, 2000);

    const playLocal = () => {
      if (localVideoDiv.current) {
        videoTrack.play(localVideoDiv.current);
      } else {
        setTimeout(playLocal, 200);
      }
    };
    playLocal();
  };

  const sendScreenShareSignal = async (active) => {
    try {
      await base44.entities.ClassroomMessage.create({
        lesson_id: id,
        sender_id: user?.id,
        sender_name: "__system",
        text: active ? "__SCREEN_SHARE:true" : "__SCREEN_SHARE:false",
      });
    } catch {}
  };

  const stopScreenShare = async () => {
    const client = clientRef.current;
    const screenTrack = screenVideoTrackRef.current;
    const screenAudio = screenAudioTrackRef.current;
    const cameraTrack = localVideoTrackRef.current;

    if (screenTrack) {
      try { await client.unpublish(screenTrack); } catch {}
      screenTrack.close();
      screenVideoTrackRef.current = null;
    }
    if (screenAudio) {
      try { await client.unpublish(screenAudio); } catch {}
      screenAudio.close();
      screenAudioTrackRef.current = null;
      if (localAudioTrackRef.current) {
        try { await client.publish(localAudioTrackRef.current); } catch {}
      }
    }
    if (cameraTrack) {
      try { await client.publish(cameraTrack); } catch {}
    }
    setIsScreenSharing(false);
    await sendScreenShareSignal(false);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      const result = await AgoraRTC.createScreenVideoTrack({ encoderConfig: "1080p_1" }, "auto");

      let screenTrack, screenAudio;
      if (Array.isArray(result)) {
        [screenTrack, screenAudio] = result;
      } else {
        screenTrack = result;
        screenAudio = null;
      }

      screenVideoTrackRef.current = screenTrack;
      screenAudioTrackRef.current = screenAudio || null;

      const client = clientRef.current;
      const cameraTrack = localVideoTrackRef.current;

      if (cameraTrack) {
        try { await client.unpublish(cameraTrack); } catch {}
      }

      if (screenAudio) {
        try { await client.unpublish(localAudioTrackRef.current); } catch {}
        await client.publish([screenTrack, screenAudio]);
      } else {
        await client.publish(screenTrack);
      }

      setIsScreenSharing(true);
      await sendScreenShareSignal(true);

      // Detect native browser "Stop sharing" button
      screenTrack.on("track-ended", () => { stopScreenShare(); });

    } catch (e) {
      if (e?.name !== "NotAllowedError") {
        console.error("[ScreenShare]", e);
      }
      toast({
        title: "Não foi possível compartilhar a tela",
        description: "Verifique as permissões do navegador ou tente em um computador.",
        variant: "destructive",
      });
    }
  };

  const leaveChannel = async () => {
    if (reconcileRef.current) {
      clearInterval(reconcileRef.current);
      reconcileRef.current = null;
    }
    if (screenVideoTrackRef.current) {
      try { screenVideoTrackRef.current.close(); } catch {}
      screenVideoTrackRef.current = null;
    }
    if (screenAudioTrackRef.current) {
      try { screenAudioTrackRef.current.close(); } catch {}
      screenAudioTrackRef.current = null;
    }
    localAudioTrackRef.current?.close();
    localVideoTrackRef.current?.close();
    localAudioTrackRef.current = null;
    localVideoTrackRef.current = null;
    try { await clientRef.current?.leave(); } catch {}
    clientRef.current = null;
    joinGuardRef.current = false;
    autoToggleRef.current = false;
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

    setMessages(prev => [...prev, {
      id: `local-${Date.now()}`,
      sender_id: user.id,
      sender_name: senderName,
      text,
      ts: Date.now(),
    }]);

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

    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await base44.functions.invoke('endLesson', { lesson_id: id, is_recorded: isRecording });
        success = true;
        break;
      } catch (e) {
        console.error(`[endLesson] attempt ${attempt + 1} failed:`, e);
        if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
      }
    }
    if (!success) {
      toast({ title: "Erro ao encerrar aula", description: "A aula pode não ter sido salva corretamente. Contate o suporte.", variant: "destructive" });
    }

    setShowReview(true);
  };

  const formatTime = (s) => {
    const totalSecs = Math.max(0, Math.round(s));
    return `${Math.floor(totalSecs / 60).toString().padStart(2, "0")}:${(totalSecs % 60).toString().padStart(2, "0")}`;
  };

  const remainingSeconds = totalDurationMins !== null
    ? Math.max(0, totalDurationMins * 60 - elapsed)
    : null;

  const minsRemaining = remainingSeconds !== null ? remainingSeconds / 60 : null;

  useEffect(() => {
    if (remainingSeconds === null) return;
    if (remainingSeconds <= 120 && remainingSeconds > 0 && !showCreditWarning) {
      setShowCreditWarning(true);
    }
    if (remainingSeconds <= 0 && !endingRef.current) {
      endLesson();
    }
  }, [Math.floor(remainingSeconds ?? 999)]);

  const displaySeconds = remainingSeconds !== null ? remainingSeconds : elapsed;

  // Student sees the remote (tutor) video enlarged when screen sharing is active
  const screenShareActive = user?.role === "student" && remoteIsScreenSharing;

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
        {/* Remote video — full area */}
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
          {/* Badge shown to student when tutor is sharing screen */}
          {screenShareActive && remoteVideoTrack && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-sm">
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span>Compartilhando tela</span>
            </div>
          )}
        </div>

        {/* Local video (PiP) — shrinks when student is watching screen share */}
        <div
          className="absolute rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black"
          style={{
            transition: "all 0.3s ease",
            bottom: screenShareActive ? 8 : 16,
            right: screenShareActive ? 8 : 16,
            width: screenShareActive ? 96 : 144,
            aspectRatio: "16/9",
          }}
        >
          <div
            ref={localVideoDiv}
            className="w-full h-full"
            style={{ display: cameraOn ? "block" : "none" }}
          />
          {!cameraOn && (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-gray-700" />
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
        {user?.role === "tutor" && (
          <button
            onClick={toggleScreenShare}
            title={isScreenSharing ? "Parar compartilhamento" : "Compartilhar tela"}
            className={`hidden sm:flex rounded-2xl items-center justify-center transition-all hover:scale-105 shadow ${
              isScreenSharing
                ? "bg-blue-100 border border-blue-300 text-blue-600"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
            }`}
            style={{ width: 52, height: 52 }}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>
        )}
        <button
          onClick={endLesson}
          disabled={lessonEnding}
          className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow-xl shadow-red-500/30 disabled:opacity-50"
          style={{ width: 56, height: 52 }}
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      <LessonReminderPopup />

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