import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, MessageSquare, Send, CheckCircle } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

export default function SupportModal({ onClose }) {
  const { user } = useAuth();
  const { lang } = useLang();
  // Tutor sempre em inglês (regra já estabelecida) — só traduz de verdade
  // quando quem está usando é aluno.
  const T = (key, en) => (user?.role === "student" ? t(lang, key) : en);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);

    await base44.functions.invoke("sendSupportMessage", {
      subject: subject.trim(),
      message: message.trim(),
    });
    setSending(false);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="rounded-3xl w-full max-w-md p-6 shadow-2xl" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(242,106,27,0.1)", border: "1px solid rgba(242,106,27,0.2)" }}>
              <MessageSquare className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base" style={{ color: "var(--app-text-primary)" }}>{T("contactSupportTitle", "Contact Support")}</h2>
              <p className="text-xs" style={{ color: "var(--app-text-secondary)" }}>{T("supportReplySoonDesc", "Our team will get back to you shortly")}</p>
            </div>
          </div>
          <button onClick={onClose} className="transition-colors" style={{ color: "var(--app-text-muted)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="font-display font-bold mb-2" style={{ color: "var(--app-text-primary)" }}>{T("messageSentTitle", "Message sent!")}</h3>
            <p className="text-sm mb-6" style={{ color: "var(--app-text-secondary)" }}>{T("supportReplySoonBody", "We'll get back to you soon.")}</p>
            <Button onClick={onClose} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
              {T("closeBtn", "Close")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--app-text-secondary)" }}>Subject</label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g. Payment issue"
                className="theme-input"
                style={{ background: "var(--app-nav-hover-bg)", borderColor: "var(--app-border)", color: "var(--app-text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--app-text-secondary)" }}>Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe your issue or question..."
                rows={5}
                className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 resize-none"
                style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)" }}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !message.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Sending..." : "Send message"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}