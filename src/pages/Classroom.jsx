import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, VideoOff, Mic, MicOff, PhoneOff, MessageCircle, Clock, Send, X, AlertTriangle, Monitor, MonitorOff, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ReviewModal from "@/components/classroom/ReviewModal";
import LessonReminderPopup from "@/components/LessonReminderPopup";
import AgoraRTC from "agora-rtc-sdk-ng";
import { LESSON_JOIN_GRACE_PERIOD_MS } from "@/lib/constants";

const ONE_TALKY_LOGO_URL = "https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/1dd8a0bc2_onetalky-logo.png";
const initialsOf = (name) => (name || "").trim().slice(0, 2).toUpperCase() || "??";

const MAX_REPUBLISH_ATTEMPTS = 3;
const REPUBLISH_RETRY_INTERVAL_MS = 5000;

export default function Classroom() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinWindowClosed, setJoinWindowClosed] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState(null);
  const [remoteUserPresent, setRemoteUserPresent] = useState(false);
  // Fica true quando as 3 tentativas automáticas de republicar o vídeo já se
  // esgotaram e ainda assim não estamos recebendo o vídeo remoto — só nesse
  // ponto o botão manual de reconexão aparece.
  const [autoRetriesExhausted, setAutoRetriesExhausted] = useState(false);
  const [manualReconnecting, setManualReconnecting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [lessonEnding, setLessonEnding] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  // Received by student: true when tutor is sharing screen
  const [remoteIsScreenSharing, setRemoteIsScreenSharing] = useState(false);
  const [totalDurationMins, setTotalDurationMins] = useState(null);
  const [studentLevel, setStudentLevel] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [micError, setMicError] = useState(null);
  const chatOpenRef = useRef(false);

  const isEnglish = user?.role === "tutor";
  const studentAccountCreditsRef = useRef(null);

  const clientRef = useRef(null);
  const reconcileRef = useRef(null);
  const joinGuardRef = useRef(false);
  const autoRepublishAttemptsRef = useRef(0);
  const lastRepublishAtRef = useRef(0);
  const remoteVideoTrackRef = useRef(null);
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
  // Horário-alvo (timestamp absoluto) em que a aula deve terminar — só é
  // definido quando tutor E aluno já estão conectados (tutor_joined_at e
  // student_joined_at preenchidos). Antes disso o cronômetro fica escondido.
  // É um valor fixo, não uma contagem local — por isso os dois lados sempre
  // veem exatamente o mesmo número.
  const [lessonEndTargetMs, setLessonEndTargetMs] = useState(null);
  const lessonEndTargetRef = useRef(null);
  const mutualPresenceComputedRef = useRef(false);

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

  // Ticker — só força re-render a cada segundo, pra o cronômetro (calculado a
  // partir de lessonEndTargetMs, um horário-alvo fixo) se atualizar na tela.
  // O encerramento automático de verdade é acionado mais abaixo, comparando
  // Date.now() com lessonEndTargetMs — não depende mais de quanto tempo faz
  // que ESTA página específica carregou.
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        elapsedRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll for remote lesson end + cálculo do horário-alvo de término (uma vez
  // só, assim que os dois participantes estiverem confirmados na sala).
  const NEXT_LESSON_BUFFER_MS = 5 * 60 * 1000; // mesmo buffer usado no backend (forceEndBackToBackLessons)

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
          return;
        }

        // Assim que tutor_joined_at E student_joined_at estiverem preenchidos,
        // calcula o horário-alvo de término (uma vez só — não recalcula depois).
        // IMPORTANTE: aula instantânea nunca tem scheduled_at — por isso esse
        // campo não pode ser exigido aqui, senão o cronômetro nunca aparece
        // pra esse tipo de aula. O limite de crédito (sempre 30min por
        // padrão, via totalDurationRef) já cobre a aula instantânea sozinho.
        if (!mutualPresenceComputedRef.current && l.tutor_joined_at && l.student_joined_at) {
          mutualPresenceComputedRef.current = true;
          const mutualJoinAtMs = Math.max(
            new Date(l.tutor_joined_at).getTime(),
            new Date(l.student_joined_at).getTime()
          );
          // Teto de crédito: tempo completo (respeitando o crédito do aluno)
          // a partir da conexão mútua. totalDurationRef já foi calculado em
          // loadLesson (min entre duração agendada — ou 30min padrão pra
          // instantânea — e o crédito disponível do aluno).
          const creditCappedMs = totalDurationRef.current !== null
            ? mutualJoinAtMs + totalDurationRef.current * 1000
            : mutualJoinAtMs + 30 * 60 * 1000; // segurança extra, nunca deveria cair aqui

          let target = creditCappedMs;

          // Só aulas AGENDADAS podem ter uma próxima aula "colada" que force
          // o encerramento no horário original — aula instantânea não tem
          // scheduled_at, então essa checagem simplesmente não se aplica a ela.
          if (l.scheduled_at) {
            const scheduledDurationMs = (l.duration_minutes || 30) * 60 * 1000;
            const scheduledEndMs = new Date(l.scheduled_at).getTime() + scheduledDurationMs;

            let hasNext = false;
            try {
              const nextLessons = await base44.entities.Lesson.filter({
                tutor_id: l.tutor_id,
                status: "scheduled",
              });
              hasNext = nextLessons.some((nl) => {
                if (!nl.scheduled_at || nl.id === l.id) return false;
                const nextStartMs = new Date(nl.scheduled_at).getTime();
                return nextStartMs >= scheduledEndMs && (nextStartMs - scheduledEndMs) <= NEXT_LESSON_BUFFER_MS;
              });
            } catch { /* se falhar, trata como se não tivesse próxima aula */ }

            if (hasNext) {
              target = Math.min(scheduledEndMs, creditCappedMs);
            }
          }

          lessonEndTargetRef.current = target;
          setLessonEndTargetMs(target);
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
          if (!chatOpenRef.current) {
            setUnreadCount(c => c + 1);
            playMessageAlert();
          }
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

  const audioCtxRef = useRef(null);
  const playMessageAlert = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {}
  };

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

      // Hard block: se a aula nunca começou (ainda "scheduled") e já passou
      // a janela de 10 minutos de tolerância, ninguém entra mais — a partir
      // daqui é o sistema de no-show que decide o que aconteceu, não esta tela.
      if (l.status === "scheduled" && l.scheduled_at) {
        const overdueMs = Date.now() - new Date(l.scheduled_at).getTime();
        if (overdueMs > LESSON_JOIN_GRACE_PERIOD_MS) {
          setJoinWindowClosed(true);
          setLoading(false);
          return;
        }
      }

      await Promise.all([
        notifyTutor(l).catch(() => {}),
        joinChannel(l),
      ]);

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
        if (user?.role === "student") {
          const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
          if (profiles.length > 0) {
            studentCredits = profiles[0].credits_minutes ?? 0;
            setStudentLevel(profiles[0].level || null);
          }
        } else {
          const res = await base44.functions.invoke('getMyStudentsProfiles', { student_ids: [l.student_id] });
          const profiles = res.data?.profiles || [];
          if (profiles.length > 0) {
            studentCredits = profiles[0].credits_minutes ?? 0;
            setStudentLevel(profiles[0].level || null);
          }
        }
      } catch {}

      studentAccountCreditsRef.current = studentCredits;
      const effectiveMins = Math.min(scheduledMins, studentCredits);
      setTotalDurationMins(effectiveMins);
      totalDurationRef.current = effectiveMins * 60;

    } catch (e) {
      console.error("[Classroom] loadLesson error:", e);
      toast({ title: isEnglish ? "Error loading lesson" : "Erro ao carregar aula", description: isEnglish ? "Could not load the lesson. Check your connection and try again." : "Não foi possível carregar a aula. Verifique sua conexão e tente novamente.", variant: "destructive" });
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

  const setRemoteTrack = (track) => {
    remoteVideoTrackRef.current = track;
    setRemoteVideoTrack(track);
    if (track) setAutoRetriesExhausted(false);
  };

  // Classifies a camera/mic creation error into a friendly reason
  const classifyDeviceError = (e) => {
    const code = e?.code;
    const msg = e?.message || "";
    if (code === "DEVICE_NOT_FOUND" || msg.includes("NotFoundError") || e?.name === "NotFoundError") return "not_found";
    if (code === "PERMISSION_DENIED" || msg.includes("NotAllowedError") || e?.name === "NotAllowedError") return "permission_denied";
    return "unknown";
  };

  const deviceErrorMessage = (device, kind) => {
    const label = device === "camera" ? (isEnglish ? "Camera" : "Câmera") : (isEnglish ? "Microphone" : "Microfone");
    if (kind === "not_found") {
      return isEnglish
        ? `${label} not found. Check that it is connected and not in use by another program (Zoom, Teams, etc).`
        : `${label} não encontrado(a). Verifique se está conectado(a) e não está sendo usado por outro programa (Zoom, Teams, etc).`;
    }
    if (kind === "permission_denied") {
      return isEnglish
        ? `${label} permission denied. Check this site's browser permissions.`
        : `Permissão de ${device === "camera" ? "câmera" : "microfone"} negada. Verifique as permissões do navegador para este site.`;
    }
    return isEnglish
      ? `Could not access your ${device === "camera" ? "camera" : "microphone"}.`
      : `Não foi possível acessar ${device === "camera" ? "sua câmera" : "seu microfone"}.`;
  };

  // Creates the local mic/camera tracks independently (one device failing
  // never blocks the other) and publishes whichever succeeded.
  const createAndPublishLocalTracks = async () => {
    const client = clientRef.current;
    let audioTrack = null;
    let videoTrack = null;

    try {
      audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      setMicError(null);
    } catch (e) {
      console.error("[Classroom] microphone error:", e);
      setMicError(deviceErrorMessage("microphone", classifyDeviceError(e)));
    }

    try {
      videoTrack = await AgoraRTC.createCameraVideoTrack();
      setCameraError(null);
    } catch (e) {
      console.error("[Classroom] camera error:", e);
      setCameraError(deviceErrorMessage("camera", classifyDeviceError(e)));
    }

    localAudioTrackRef.current = audioTrack;
    localVideoTrackRef.current = videoTrack;
    setMicOn(!!audioTrack);
    setCameraOn(!!videoTrack);

    const tracksToPublish = [audioTrack, videoTrack].filter(Boolean);
    if (tracksToPublish.length > 0) {
      await client.publish(tracksToPublish);
    }
  };

  // Retries creating whichever device(s) previously failed, without
  // rejoining the channel or reloading the page.
  const retryDeviceAccess = async () => {
    const client = clientRef.current;
    if (!client) return;

    if (micError) {
      try {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = audioTrack;
        await client.publish(audioTrack);
        setMicError(null);
        setMicOn(true);
      } catch (e) {
        console.error("[Classroom] microphone retry error:", e);
        setMicError(deviceErrorMessage("microphone", classifyDeviceError(e)));
      }
    }

    if (cameraError) {
      try {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoTrackRef.current = videoTrack;
        await client.publish(videoTrack);
        setCameraError(null);
        setCameraOn(true);
        if (localVideoDiv.current) videoTrack.play(localVideoDiv.current);
      } catch (e) {
        console.error("[Classroom] camera retry error:", e);
        setCameraError(deviceErrorMessage("camera", classifyDeviceError(e)));
      }
    }
  };

  const joinChannel = async (l) => {
    if (joinGuardRef.current) return;
    joinGuardRef.current = true;
    setAutoRetriesExhausted(false);

    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    client.on("user-published", async (remoteAgoraUser, mediaType) => {
      try {
        await client.subscribe(remoteAgoraUser, mediaType);
        if (mediaType === "video" && remoteAgoraUser.videoTrack) {
          setRemoteTrack(remoteAgoraUser.videoTrack);
        }
        if (mediaType === "audio" && remoteAgoraUser.audioTrack) {
          remoteAgoraUser.audioTrack.play();
        }
      } catch (e) {
        console.error("[Agora] subscribe failed:", e);
      }
    });

    client.on("user-unpublished", (_, mediaType) => {
      if (mediaType === "video") setRemoteTrack(null);
    });

    client.on("user-joined", async () => {
      setRemoteUserPresent(true);
      // Republicação automática removida — a reconexão de vídeo agora é só
      // manual, acionada pelo botão "Reconnect video" (envia um sinal pro
      // outro lado, que faz o toggle silencioso na PRÓPRIA câmera dele).
    });

    client.on("user-left", () => {
      setRemoteTrack(null);
      setRemoteUserPresent((clientRef.current?.remoteUsers.length || 0) > 0);
    });

    const uid = uidFromUserId(user?.id);
    const channelName = id;

    const { token, appId } = await fetchAgoraToken(channelName, uid);
    if (!appId) throw new Error("App ID do Agora não configurado");

    client.on("token-privilege-will-expire", async () => {
      const { token: newToken } = await fetchAgoraToken(channelName, uid);
      await client.renewToken(newToken);
    });

    await client.join(appId, channelName, token, uid);

    await createAndPublishLocalTracks();
    setJoined(true);

    // Republicação preventiva: alguns publishes iniciais falham
    // silenciosamente sem o lado que publica perceber (a própria prévia
    // continua parecendo normal). Forçar um ciclo de
    // despublicar+republicar uma vez, cedo, evita depender só da detecção
    // reativa do outro lado.
    setTimeout(async () => {
      if (!localVideoTrackRef.current || !clientRef.current) return;
      try {
        await clientRef.current.unpublish(localVideoTrackRef.current);
        await new Promise(r => setTimeout(r, 300));
        await clientRef.current.publish(localVideoTrackRef.current);
        console.log(`[Agora] preventive early republish completed (role=${user?.role})`);
      } catch (e) {
        console.error("[Agora] preventive early republish failed:", e);
      }
    }, 4000); // 4 segundos depois de entrar, tempo suficiente pra conexão estabilizar

    // Mark this participant as joined (presence tracking for no-show detection).
    // Fire-and-forget — must never block the classroom UI.
    base44.functions.invoke('markLessonJoined', { lesson_id: l.id }).catch(() => {});

    // Reconciliation: the "user-published" event is missed when the other side
    // published before we finished joining. Re-check the channel periodically.
    const reconcile = async () => {
      setRemoteUserPresent(client.remoteUsers.length > 0);
      for (const remoteUser of client.remoteUsers) {
        try {
          if (remoteUser.hasVideo && !remoteUser.videoTrack) {
            await client.subscribe(remoteUser, "video");
          }
          if (remoteUser.videoTrack && remoteVideoTrackRef.current !== remoteUser.videoTrack) {
            setRemoteTrack(remoteUser.videoTrack);
          }
          if (remoteUser.hasAudio && !remoteUser.audioTrack) {
            await client.subscribe(remoteUser, "audio");
            remoteUser.audioTrack?.play();
          }
        } catch (e) {
          console.error("[Agora] reconcile failed:", e);
        }
      }

      // Symmetric republish reconciliation (runs for both tutor and student):
      // if the other participant is in the room but we still haven't received
      // their video after REPUBLISH_RETRY_INTERVAL_MS, force a full republish
      // (unpublish + publish) of our own video track. This forces Agora to
      // fully renegotiate the publication and re-fire "user-published" on the
      // other side — more reliable than just muting/unmuting the track.
      // Retries up to MAX_REPUBLISH_ATTEMPTS times if the remote video still
      // doesn't show up.
      if (
        client.remoteUsers.length > 0 &&
        !remoteVideoTrackRef.current &&
        autoRepublishAttemptsRef.current < MAX_REPUBLISH_ATTEMPTS &&
        localVideoTrackRef.current &&
        Date.now() - lastRepublishAtRef.current > REPUBLISH_RETRY_INTERVAL_MS
      ) {
        autoRepublishAttemptsRef.current += 1;
        lastRepublishAtRef.current = Date.now();
        const attempt = autoRepublishAttemptsRef.current;
        const videoTrack = localVideoTrackRef.current;
        try {
          await client.unpublish(videoTrack);
          await new Promise(r => setTimeout(r, 300));
          await client.publish(videoTrack);
          if (localVideoDiv.current) videoTrack.play(localVideoDiv.current);
          console.log(`[Agora] auto-republish attempt ${attempt}/${MAX_REPUBLISH_ATTEMPTS} completed (role=${user?.role})`);
        } catch (e) {
          console.error(`[Agora][CRITICAL] auto-republish attempt ${attempt}/${MAX_REPUBLISH_ATTEMPTS} FAILED (role=${user?.role}) — the other participant may still not receive video`, e);
        }
      }

      // As 3 tentativas automáticas já se esgotaram e ainda não estamos
      // recebendo vídeo remoto — libera o botão manual de reconexão.
      if (
        client.remoteUsers.length > 0 &&
        !remoteVideoTrackRef.current &&
        autoRepublishAttemptsRef.current >= MAX_REPUBLISH_ATTEMPTS
      ) {
        setAutoRetriesExhausted(true);
      }
    };
    reconcile();
    reconcileRef.current = setInterval(reconcile, 2000);

    const playLocal = () => {
      const videoTrack = localVideoTrackRef.current;
      if (!videoTrack) return;
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
      await base44.functions.invoke("sendClassroomMessage", {
        lesson_id: id,
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
        title: isEnglish ? "Could not share screen" : "Não foi possível compartilhar a tela",
        description: isEnglish ? "Check browser permissions or try on a computer." : "Verifique as permissões do navegador ou tente em um computador.",
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
    autoRepublishAttemptsRef.current = 0;
    lastRepublishAtRef.current = 0;
    remoteVideoTrackRef.current = null;
    setRemoteUserPresent(false);
  };

  // Último recurso, acionado manualmente pelo usuário: sai da conexão de
  // vídeo e entra de novo do zero — só do lado de quem clicou, sem tirar a
  // outra pessoa da aula. Diferente da republicação automática (que só
  // republica a própria faixa de vídeo), isso reinicia a conexão inteira.
  const manualReconnect = async () => {
    if (manualReconnecting) return;
    setManualReconnecting(true);
    try {
      await leaveChannel();
      await joinChannel(lessonRef.current);
    } catch (e) {
      console.error("[Classroom] manual reconnect failed:", e);
      toast({
        title: isEnglish ? "Reconnection failed" : "Falha ao reconectar",
        description: isEnglish ? "Please try again in a moment." : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setManualReconnecting(false);
    }
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
        if (profiles.length > 0) senderName = profiles[0].display_name || profiles[0].full_name || senderName;
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
      const response = await base44.functions.invoke("sendClassroomMessage", {
        lesson_id: id,
        sender_name: senderName,
        text,
      });
      if (response.data?.error) throw new Error(response.data.error);
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
        await base44.functions.invoke('endLesson', { lesson_id: id, is_recorded: false });
        success = true;
        break;
      } catch (e) {
        console.error(`[endLesson] attempt ${attempt + 1} failed:`, e);
        if (attempt < 2) await new Promise(r => setTimeout(r, 1500));
      }
    }
    if (!success) {
      toast({ title: isEnglish ? "Error ending lesson" : "Erro ao encerrar aula", description: isEnglish ? "The lesson may not have been saved correctly. Contact support." : "A aula pode não ter sido salva corretamente. Contate o suporte.", variant: "destructive" });
    }

    setShowReview(true);
  };

  const formatTime = (s) => {
    const totalSecs = Math.max(0, Math.round(s));
    return `${Math.floor(totalSecs / 60).toString().padStart(2, "0")}:${(totalSecs % 60).toString().padStart(2, "0")}`;
  };

  // remainingSeconds só existe depois que os dois participantes se conectaram
  // (lessonEndTargetMs definido) — antes disso o cronômetro fica escondido.
  // "elapsed" aqui não é mais usado pro cálculo, só serve de gatilho de
  // re-render (o valor real vem de Date.now() vs. o horário-alvo fixo).
  const remainingSeconds = lessonEndTargetMs !== null
    ? Math.max(0, (lessonEndTargetMs - Date.now()) / 1000)
    : null;
  void elapsed; // gatilho de re-render a cada segundo, valor em si não é usado

  const minsRemaining = remainingSeconds !== null ? remainingSeconds / 60 : null;
  const isAccountCreditLow = studentAccountCreditsRef.current !== null && studentAccountCreditsRef.current <= 10;

  useEffect(() => {
    if (remainingSeconds === null) return;
    if (remainingSeconds <= 120 && remainingSeconds > 0 && !showCreditWarning) {
      setShowCreditWarning(true);
    }
    if (remainingSeconds <= 0 && !endingRef.current) {
      endLesson();
    }
  }, [Math.floor(remainingSeconds ?? 999)]);

  const displaySeconds = remainingSeconds ?? 0;

  // Student sees the remote (tutor) video enlarged when screen sharing is active
  const screenShareActive = user?.role === "student" && remoteIsScreenSharing;

  const otherPersonName = user?.role === "tutor" ? lesson?.student_name : lesson?.tutor_name;
  const isLowTime = minsRemaining !== null && minsRemaining <= 2;

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-ot-bg font-jakarta">
      <div className="w-9 h-9 border-[3px] border-ot-primary/20 border-t-ot-primary rounded-full animate-spin" />
    </div>
  );

  if (joinWindowClosed) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-ot-bg font-jakarta text-center px-6">
      <AlertTriangle className="w-10 h-10 text-amber-500 mb-4" />
      <h2 className="text-lg font-bold text-white mb-2">This lesson can no longer be joined</h2>
      <p className="text-sm text-gray-400 max-w-sm mb-6">
        The 10-minute window to join this lesson has passed. This lesson is being processed by our system.
      </p>
      <Button onClick={() => navigate(user?.role === "student" ? "/" : "/my-lessons")} className="bg-ot-primary text-white border-0">
        Back
      </Button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-ot-bg flex flex-col z-50 font-jakarta">
      {/* Credit warning banner */}
      {user?.role === "student" && showCreditWarning && minsRemaining !== null && minsRemaining > 0 && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-ot-warn-bg border-b border-ot-warn-border">
          <div className="flex items-center gap-2 text-ot-warn-text text-sm font-semibold min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {isEnglish
                ? `${Math.ceil(minsRemaining)} minute(s) left in this lesson`
                : `Restam ${Math.ceil(minsRemaining)} minuto${Math.ceil(minsRemaining) !== 1 ? "s" : ""} de crédito nesta aula`}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAccountCreditLow && (
              <button
                onClick={() => navigate("/plans")}
                className="bg-gradient-to-br from-ot-primary to-[#FB9A3C] hover:brightness-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              >
                {isEnglish ? "Add credits" : "Adicionar créditos"}
              </button>
            )}
            <button onClick={() => setShowCreditWarning(false)} className="text-ot-warn-text/60 hover:text-ot-warn-text">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tutor: aviso de que a aula está terminando (sempre em inglês) */}
      {user?.role === "tutor" && showCreditWarning && minsRemaining !== null && minsRemaining > 0 && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 bg-ot-warn-bg border-b border-ot-warn-border">
          <div className="flex items-center gap-2 text-ot-warn-text text-sm font-semibold min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">
              This lesson will end in {Math.ceil(minsRemaining)} minute{Math.ceil(minsRemaining) !== 1 ? "s" : ""} — please wrap up.
            </span>
          </div>
          <button onClick={() => setShowCreditWarning(false)} className="text-ot-warn-text/60 hover:text-ot-warn-text shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-5 py-2 bg-white border-b border-ot-border shadow-sm gap-3">
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center pointer-events-none">
          <img src={ONE_TALKY_LOGO_URL} alt="One Talky" className="w-auto object-contain" style={{ height: 72 }} />
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <img src={ONE_TALKY_LOGO_URL} alt="One Talky" className="w-auto object-contain md:hidden shrink-0" style={{ height: 40 }} />
          <div className="w-10 h-10 rounded-xl bg-ot-tint text-ot-primary flex items-center justify-center font-bold text-sm shrink-0">
            {initialsOf(otherPersonName)}
          </div>
          <div className="min-w-0">
            <p className="text-ot-text text-[15px] font-bold truncate">{otherPersonName}</p>
            <p className="text-ot-text-secondary text-[12.5px] font-semibold capitalize truncate">{lesson?.language} · {studentLevel || (isEnglish ? "session" : "sessão")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {remainingSeconds !== null ? (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${
              isLowTime ? "border-red-300 bg-red-50 animate-pulse" : "border-ot-primary/20 bg-ot-tint"
            }`}>
              <Clock className={`w-4 h-4 ${isLowTime ? "text-ot-danger" : "text-ot-primary"}`} />
              <div className="leading-none">
                <p className={`text-[9px] font-bold uppercase tracking-wide ${isLowTime ? "text-ot-danger/70" : "text-ot-primary/70"}`}>{isEnglish ? "Remaining" : "Restante"}</p>
                <p className={`text-[16px] font-extrabold tabular-nums ${isLowTime ? "text-ot-danger" : "text-ot-primary"}`}>{formatTime(displaySeconds)}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-ot-primary/20 bg-ot-tint">
              <Clock className="w-4 h-4 text-ot-primary animate-pulse" />
              <p className="text-[11px] font-bold text-ot-primary/70">{isEnglish ? "Waiting for both..." : "Aguardando os dois..."}</p>
            </div>
          )}
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Remote video — full area, shrinks when chat panel is open on desktop */}
        <div className={`flex-1 relative ${screenShareActive ? "bg-[#1C1917]" : "bg-ot-canvas"}`}>
          <div
            ref={remoteVideoDiv}
            className="w-full h-full"
            style={{ display: remoteVideoTrack ? "block" : "none" }}
          />
          {!remoteVideoTrack && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-5">
                  {!remoteUserPresent && (
                    <div className="absolute inset-0 rounded-full border-4 border-ot-primary/20 border-t-ot-primary animate-spin" />
                  )}
                  <div className="absolute inset-2 rounded-full bg-ot-tint flex items-center justify-center text-ot-primary font-bold text-lg">
                    {initialsOf(otherPersonName)}
                  </div>
                </div>
                <p className="text-ot-text-secondary text-sm font-semibold">
                  {remoteUserPresent
                    ? (isEnglish
                        ? `${user?.role === "tutor" ? "Student" : "Tutor"} connected (no camera)`
                        : `${user?.role === "tutor" ? "Aluno" : "Tutor"} conectado (sem câmera)`)
                    : (isEnglish
                        ? `Waiting for ${user?.role === "tutor" ? "the student" : "the tutor"} to connect…`
                        : `Aguardando ${user?.role === "tutor" ? "o aluno" : "o tutor"} conectar…`)}
                </p>
                {joined && <p className="text-ot-online text-xs mt-1.5 font-semibold">{isEnglish ? "● You are connected" : "● Você está conectado"}</p>}
                {autoRetriesExhausted && remoteUserPresent && (
                  <button
                    onClick={manualReconnect}
                    disabled={manualReconnecting}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-ot-primary hover:brightness-95 transition-all disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${manualReconnecting ? "animate-spin" : ""}`} />
                    {manualReconnecting
                      ? (isEnglish ? "Reconnecting…" : "Reconectando…")
                      : (isEnglish ? "Reconnect video" : "Reconectar vídeo")}
                  </button>
                )}
              </div>
            </div>
          )}
          {/* Badge shown to student when tutor is sharing screen */}
          {screenShareActive && remoteVideoTrack && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/70 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg backdrop-blur-sm">
              <Monitor className="w-3.5 h-3.5" />
              <span>{isEnglish ? `${lesson?.tutor_name || "Tutor"} is sharing their screen` : `${lesson?.tutor_name || "Tutor"} está compartilhando a tela`}</span>
            </div>
          )}

          {/* Local video (PiP) — nested inside the remote video area so it stays
              positioned relative to the video stage, not the whole layout
              (including the chat panel) — shrinks when watching screen share */}
          {cameraError && micError ? (
            <div className="absolute bottom-4 right-4 z-20 w-[260px] max-w-[90vw] bg-white rounded-2xl shadow-lg border border-ot-border p-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-ot-danger mt-0.5 shrink-0" />
                <div className="text-xs text-ot-text-secondary space-y-1.5">
                  <p>{cameraError}</p>
                  <p>{micError}</p>
                </div>
              </div>
              <button
                onClick={retryDeviceAccess}
                className="w-full bg-ot-primary text-white text-xs font-bold py-2 rounded-xl hover:brightness-95 transition-all"
              >
                {isEnglish ? "Try again" : "Tentar novamente"}
              </button>
            </div>
          ) : (
            <>
              <div
                className={`absolute rounded-2xl overflow-hidden shadow-lg border-2 border-white bg-[#1C1917] z-20 transition-all duration-300 ${
                  screenShareActive
                    ? "bottom-2 right-2 w-[72px] h-[104px] sm:w-[130px] sm:h-[78px]"
                    : "bottom-4 right-4 w-[104px] h-[150px] sm:w-[200px] sm:h-[120px]"
                }`}
              >
                {cameraError ? (
                  <div className="w-full h-full bg-white flex flex-col items-center justify-center text-center p-2 gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-ot-danger shrink-0" />
                    <p className="text-[10px] text-ot-text-secondary leading-tight line-clamp-3">{cameraError}</p>
                    <button
                      onClick={retryDeviceAccess}
                      className="text-[10px] font-bold text-ot-primary underline underline-offset-2"
                    >
                      {isEnglish ? "Try again" : "Tentar novamente"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      ref={localVideoDiv}
                      className="w-full h-full"
                      style={{ display: cameraOn ? "block" : "none" }}
                    />
                    {!cameraOn && (
                      <div className="w-full h-full bg-[#1C1917] flex items-center justify-center">
                        <VideoOff className="w-5 h-5 text-white/40" />
                      </div>
                    )}
                  </>
                )}
              </div>

              {micError && (
                <div className="absolute bottom-4 right-[112px] sm:right-[208px] z-20 max-w-[180px] bg-white rounded-xl shadow-lg border border-ot-border p-2.5 flex items-start gap-1.5">
                  <MicOff className="w-3.5 h-3.5 text-ot-danger mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-ot-text-secondary leading-tight">{micError}</p>
                    <button
                      onClick={retryDeviceAccess}
                      className="text-[10px] font-bold text-ot-primary underline underline-offset-2 mt-0.5"
                    >
                      {isEnglish ? "Try again" : "Tentar novamente"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Chat panel — desktop: fixed column beside video; mobile: bottom sheet */}
        {chatOpen && (
          <div className="flex flex-col bg-white z-30 absolute inset-x-0 bottom-0 h-[70%] rounded-t-3xl shadow-2xl border-t border-ot-border md:static md:inset-auto md:h-full md:w-[360px] md:rounded-none md:shadow-none md:border-t-0 md:border-l">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-ot-border">
              <p className="text-ot-text text-sm font-bold">{isEnglish ? "Lesson chat" : "Chat da aula"}</p>
              <button
                onClick={() => { chatOpenRef.current = false; setChatOpen(false); }}
                className="w-8 h-8 rounded-lg bg-[#F7F5F2] flex items-center justify-center text-ot-text-secondary hover:text-ot-text transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
              {messages.map((m, i) => {
                const isMe = m.sender_id === user?.id;
                const timeStr = new Date(m.ts).toLocaleTimeString(isEnglish ? "en-US" : "pt-BR", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={m.id || i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`px-3.5 py-2.5 text-sm leading-[1.45] font-medium max-w-[85%] ${
                      isMe
                        ? "bg-gradient-to-br from-ot-primary to-[#FB9A3C] text-white rounded-2xl rounded-br-[4px]"
                        : "bg-[#F7F5F2] text-ot-text rounded-2xl rounded-bl-[4px]"
                    }`}>
                      {m.text}
                    </div>
                    <p className="text-[11px] text-ot-text-secondary mt-1 px-1">
                      {isMe ? (isEnglish ? "You" : "Você") : m.sender_name?.split("@")[0]} · {timeStr}
                    </p>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="text-ot-text-secondary text-xs text-center mt-4">{isEnglish ? "No messages yet" : "Nenhuma mensagem ainda"}</p>
              )}
              <div ref={chatBottomRef} />
            </div>
            <div className="p-3 border-t border-ot-border bg-white">
              <div className="flex gap-2">
                <Input
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder={isEnglish ? "Type a message..." : "Digite uma mensagem..."}
                  className="bg-[#F7F5F2] border-ot-border text-ot-text placeholder:text-ot-text-secondary text-sm"
                />
                <Button size="icon" onClick={sendMessage} className="bg-gradient-to-br from-ot-primary to-[#FB9A3C] hover:brightness-95 text-white border-0 shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls — estilo Google Meet: círculo cinza escuro, ícone laranja
          (cor da marca), botão de desligar em vermelho. */}
      <div className="flex items-center justify-center gap-3 py-4 px-4" style={{ background: "#202124" }}>
          <button
            onClick={toggleMic}
            className={`rounded-full flex items-center justify-center transition-all hover:scale-105 w-[52px] h-[52px] sm:w-14 sm:h-14 ${
              micOn ? "bg-[#3c4043] hover:bg-[#4a4d51] text-ot-primary" : "bg-[#3c4043] hover:bg-[#4a4d51] text-ot-danger"
            }`}
          >
            {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
          <button
            onClick={toggleCamera}
            className={`rounded-full flex items-center justify-center transition-all hover:scale-105 w-[52px] h-[52px] sm:w-14 sm:h-14 ${
              cameraOn ? "bg-[#3c4043] hover:bg-[#4a4d51] text-ot-primary" : "bg-[#3c4043] hover:bg-[#4a4d51] text-ot-danger"
            }`}
          >
            {cameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
          <button
            onClick={() => { const next = !chatOpenRef.current; chatOpenRef.current = next; setChatOpen(next); if (next) setUnreadCount(0); }}
            className={`relative rounded-full flex items-center justify-center transition-all hover:scale-105 w-[52px] h-[52px] sm:w-14 sm:h-14 bg-[#3c4043] hover:bg-[#4a4d51] ${
              chatOpen ? "text-white ring-2 ring-ot-primary/60" : "text-ot-primary"
            }`}
          >
            <MessageCircle className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-ot-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#202124]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {user?.role === "tutor" && (
            <button
              onClick={toggleScreenShare}
              title={isScreenSharing ? (isEnglish ? "Stop sharing" : "Parar compartilhamento") : (isEnglish ? "Share screen" : "Compartilhar tela")}
              className={`hidden sm:flex rounded-full items-center justify-center transition-all hover:scale-105 w-14 h-14 bg-[#3c4043] hover:bg-[#4a4d51] ${
                isScreenSharing ? "text-white ring-2 ring-ot-primary/60" : "text-ot-primary"
              }`}
            >
              {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
            </button>
          )}
          <button
            onClick={endLesson}
            disabled={lessonEnding}
            className="bg-ot-danger hover:brightness-95 text-white rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50 w-14 h-[52px] sm:h-14"
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