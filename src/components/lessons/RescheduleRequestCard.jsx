import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Send, Check, X } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

export default function RescheduleRequestCard({ lesson, request, onResolved }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();
  // Tutor sempre em inglês (regra já estabelecida) — só traduz de verdade
  // quando quem está usando é aluno.
  const T = (key, en) => (user?.role === "student" ? t(lang, key) : en);
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isStudent = user?.role === "student";

  useEffect(() => {
    loadThread();
  }, [request.id]);

  const loadThread = async () => {
    try {
      const res = await base44.functions.invoke('getLessonChangeThread', { request_id: request.id });
      if (res.data) setThread(res.data);
    } catch {} finally { setLoading(false); }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('respondToRescheduleRequest', {
        request_id: request.id, action: "accept",
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: T("rescheduleAcceptedToast", "Time accepted!"), description: T("rescheduleMovedDesc", "The lesson has been moved to the new time.") });
      onResolved();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || T("genericTryAgain", "Please try again.");
      toast({ title: T("rescheduleAcceptErrorTitle", "Error accepting"), description: msg, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('respondToRescheduleRequest', {
        request_id: request.id, action: "reject",
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: T("rescheduleRejectedToast", "Proposal declined"), description: T("rescheduleKeptDesc", "The lesson stays at the original time.") });
      onResolved();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || T("genericTryAgain", "Please try again.");
      toast({ title: T("rescheduleRejectErrorTitle", "Error declining"), description: msg, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setActionLoading(true);
    try {
      const res = await base44.functions.invoke('sendLessonChangeMessage', {
        request_id: request.id, message: message.trim(),
      });
      if (res.data?.error) throw new Error(res.data.error);
      setMessage("");
      loadThread();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || T("genericTryAgain", "Please try again.");
      toast({ title: T("rescheduleSendErrorTitle", "Error sending message"), description: msg, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  if (loading) return null;

  const LOCALE_MAP = { en: "en-US", pt_br: "pt-BR", pt_pt: "pt-PT", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT", ja: "ja-JP", ko: "ko-KR" };
  const proposedDate = new Date(request.proposed_scheduled_at).toLocaleString(
    isStudent ? (LOCALE_MAP[lang] || "en-US") : "en-US",
    { dateStyle: 'full', timeStyle: 'short' }
  );

  const messages = thread?.messages || [];

  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(242,106,27,0.08)", border: "1px solid rgba(242,106,27,0.25)" }}>
      <div className="flex items-start gap-2 mb-3">
        <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#F26A1B" }} />
        <div className="flex-1">
          {isStudent ? (
            <>
              <p className="font-semibold text-sm" style={{ color: "var(--app-text-primary)" }}>
                {T("tutorProposedNewTime", "Your tutor proposed changing the lesson to:")}
              </p>
              <p className="font-bold text-sm mt-0.5" style={{ color: "#F26A1B" }}>{proposedDate}</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-sm" style={{ color: "var(--app-text-primary)" }}>
                Waiting for the student's response about the new proposed time:
              </p>
              <p className="font-bold text-sm mt-0.5" style={{ color: "#F26A1B" }}>{proposedDate}</p>
            </>
          )}
        </div>
      </div>

      {messages.length > 0 && (
        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
          {messages.map(m => {
            const isMine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className="rounded-xl px-3 py-2 max-w-[80%] text-sm"
                  style={isMine
                    ? { background: "#F26A1B", color: "#fff" }
                    : { background: "rgba(255,255,255,0.08)", color: "var(--app-text-primary)" }}>
                  <p className="text-[10px] opacity-60 mb-0.5">{m.sender_role === 'tutor' ? T("tutorLabel", "Tutor") : T("studentLabel", "Student")}</p>
                  <p className="break-words">{m.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={T("writeMessagePlaceholder", "Write a message...")}
          className="resize-none h-16 text-sm"
          style={{
            background: "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.1)",
            color: "var(--app-text-primary)",
          }}
        />
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim() || actionLoading}
          size="icon"
          className="shrink-0 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {isStudent && request.status === "pending" && (
        <div className="flex gap-2">
          <Button
            onClick={handleReject}
            disabled={actionLoading}
            variant="outline"
            className="flex-1 rounded-xl border-red-500/20 text-red-400 hover:text-red-300 hover:border-red-500/40 bg-transparent"
          >
            <X className="w-4 h-4 mr-1" /> Recusar
          </Button>
          <Button
            onClick={handleAccept}
            disabled={actionLoading}
            className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white border-0"
          >
            <Check className="w-4 h-4 mr-1" /> Aceitar
          </Button>
        </div>
      )}
    </div>
  );
}