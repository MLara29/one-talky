import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, MessageSquare, Send, CheckCircle } from "lucide-react";

export default function SupportModal({ onClose }) {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    await base44.entities.SupportMessage.create({
      sender_id: user.id,
      sender_name: user.full_name || user.email,
      sender_role: user.role,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSending(false);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#0d0d1a] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-base">Falar com o suporte</h2>
              <p className="text-gray-500 text-xs">Nossa equipe responderá em breve</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
            <h3 className="font-display font-bold text-white mb-2">Mensagem enviada!</h3>
            <p className="text-gray-500 text-sm mb-6">Entraremos em contato em breve.</p>
            <Button onClick={onClose} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0">
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Assunto</label>
              <Input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ex: Problema com pagamento"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium mb-1.5 block">Mensagem</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Descreva seu problema ou dúvida..."
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 resize-none"
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !message.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Enviando..." : "Enviar mensagem"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}