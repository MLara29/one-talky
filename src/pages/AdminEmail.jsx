import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, Bell, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const TIME_OPTIONS = [
  { label: "15 minutos", value: 15 },
  { label: "30 minutos", value: 30 },
  { label: "1 hora", value: 60 },
  { label: "2 horas", value: 120 },
  { label: "3 horas", value: 180 },
  { label: "6 horas", value: 360 },
  { label: "12 horas", value: 720 },
  { label: "24 horas", value: 1440 },
];

export default function AdminEmail() {
  const [testTo, setTestTo] = useState("");
  const [testSubject, setTestSubject] = useState("Teste de e-mail — OneTalky");
  const [testBody, setTestBody] = useState("Olá! Este é um e-mail de teste da plataforma OneTalky. 🎉");
  const [sending, setSending] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [reminderResult, setReminderResult] = useState(null);
  const [tutorMinutes, setTutorMinutes] = useState(60);
  const [studentMinutes, setStudentMinutes] = useState(30);

  const handleTestEmail = async () => {
    if (!testTo) return toast({ title: "Informe o e-mail de destino", variant: "destructive" });
    setSending(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke("sendEmail", {
        to: testTo,
        subject: testSubject,
        text: testBody,
        html: `<div style="font-family:sans-serif;padding:20px;">${testBody.replace(/\n/g, "<br>")}</div>`,
      });
      setTestResult({ ok: true, data: res.data });
      toast({ title: "E-mail enviado com sucesso!" });
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  const handleSendReminders = async () => {
    setReminding(true);
    setReminderResult(null);
    try {
      const res = await base44.functions.invoke("sendLessonReminder", {
        tutor_minutes: tutorMinutes,
        student_minutes: studentMinutes,
      });
      setReminderResult({ ok: true, data: res.data });
      toast({ title: `Lembretes enviados: ${res.data.sent}` });
    } catch (e) {
      setReminderResult({ ok: false, error: e.message });
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setReminding(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl theme-heading text-white mb-1">E-mail & Lembretes</h1>
      <p className="theme-subtext text-gray-500 text-sm mb-8">Configure e teste o envio de e-mails via SMTP.</p>

      {/* SMTP Status */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
        <h2 className="font-semibold theme-heading text-white text-sm mb-3 flex items-center gap-2">
          <Mail className="w-4 h-4 text-violet-400" /> Configuração SMTP
        </h2>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            ["Host", "Configurado via secret"],
            ["Porta", "Configurado via secret"],
            ["Usuário", "Configurado via secret"],
            ["Remetente", "Configurado via secret"],
          ].map(([label, val]) => (
            <div key={label} className="bg-white/5 rounded-lg p-2.5">
              <p className="text-gray-500 mb-0.5">{label}</p>
              <p className="theme-heading text-white font-medium truncate">{val}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5" /> Secrets configurados no painel
        </p>
      </div>

      {/* Test Email */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
        <h2 className="font-semibold theme-heading text-white text-sm mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-violet-400" /> Enviar e-mail de teste
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Destinatário</label>
            <Input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="email@exemplo.com" type="email" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Assunto</label>
            <Input value={testSubject} onChange={e => setTestSubject(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Mensagem</label>
            <Textarea value={testBody} onChange={e => setTestBody(e.target.value)} rows={4} className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 resize-none" />
          </div>
          <Button onClick={handleTestEmail} disabled={sending} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
            {sending ? "Enviando..." : "Enviar e-mail de teste"}
          </Button>
          {testResult && (
            <div className={`text-xs p-3 rounded-lg flex items-start gap-2 ${testResult.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {testResult.ok ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{testResult.ok ? `Enviado! ID: ${testResult.data?.messageId}` : testResult.error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lesson Reminders */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5">
        <h2 className="font-semibold theme-heading text-white text-sm mb-1 flex items-center gap-2">
          <Bell className="w-4 h-4 text-violet-400" /> Lembretes de Aulas
        </h2>
        <p className="text-xs text-gray-500 mb-5">Defina com quanto tempo de antecedência cada grupo deve receber o lembrete.</p>

        <div className="grid grid-cols-2 gap-4 mb-5">
          {/* Tutor */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-violet-400" />
              <p className="text-sm font-medium text-white theme-heading">Tutores</p>
            </div>
            <p className="text-xs text-gray-500 mb-2">Enviar lembrete com:</p>
            <div className="flex flex-wrap gap-1.5">
              {TIME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTutorMinutes(opt.value)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    tutorMinutes === opt.value
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-violet-500/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Student */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-indigo-400" />
              <p className="text-sm font-medium text-white theme-heading">Alunos</p>
            </div>
            <p className="text-xs text-gray-500 mb-2">Enviar lembrete com:</p>
            <div className="flex flex-wrap gap-1.5">
              {TIME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStudentMinutes(opt.value)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    studentMinutes === opt.value
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-indigo-500/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-4 text-xs text-violet-300">
          Tutores receberão o e-mail <strong>{TIME_OPTIONS.find(o => o.value === tutorMinutes)?.label}</strong> antes da aula &nbsp;·&nbsp;
          Alunos receberão <strong>{TIME_OPTIONS.find(o => o.value === studentMinutes)?.label}</strong> antes.
        </div>

        <Button onClick={handleSendReminders} disabled={reminding} variant="outline" className="w-full border-white/10 text-white hover:bg-white/10">
          {reminding ? "Enviando lembretes..." : "Enviar lembretes agora"}
        </Button>
        {reminderResult && (
          <div className={`text-xs p-3 rounded-lg flex items-start gap-2 mt-3 ${reminderResult.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {reminderResult.ok ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>
              {reminderResult.ok
                ? `${reminderResult.data.sent} lembretes enviados. ${reminderResult.data.message || ''}`
                : reminderResult.error}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}