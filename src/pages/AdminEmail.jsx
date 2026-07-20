import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Send, Bell, CheckCircle, AlertCircle, Clock, Eye } from "lucide-react";
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

const EMAIL_TEMPLATES = [
  { id: "payment_processing", label: "💸 Payment Processing", subject: "💸 Your payment is being processed – One Talky" },
  { id: "payment_paid", label: "✅ Payment Sent", subject: "✅ Payment sent! Please confirm receipt – One Talky" },
  { id: "lesson_tutor", label: "🎙️ Lesson Reminder (Tutor)", subject: "⏰ Your lesson starts in 1 hour – One Talky" },
  { id: "lesson_student", label: "💬 Lesson Reminder (Student)", subject: "🎙️ Your lesson starts in 30 minutes – One Talky" },
];

function getTemplateHtml(id) {
  const now = "Monday, July 21, 2026, 09:00 AM";
  if (id === "payment_processing") return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px"><h2 style="color:#F26A1B;margin-bottom:8px">Hi, Maria Silva! 👋</h2><p style="color:#374151;font-size:16px">Your payment of <strong style="color:#10b981">$45.00</strong> is currently being processed by the One Talky team.</p><p style="color:#374151;font-size:15px">You will receive another email once the payment has been sent to your account.</p><p style="color:#6b7280;font-size:13px;margin-top:24px">If you have any questions, please reach out through the platform support.</p><p style="color:#6b7280;font-size:13px">The One Talky Team 🧡</p></div>`;
  if (id === "payment_paid") return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:12px"><h2 style="color:#F26A1B;margin-bottom:8px">Hi, Maria Silva! 🎉</h2><p style="color:#374151;font-size:16px">Your payment of <strong style="color:#10b981">$45.00</strong> has been successfully sent!</p><p style="color:#374151;font-size:15px">Please log in to <strong>One Talky</strong> and confirm receipt in your earnings section.</p><a href="https://onetalky.base44.app/earnings" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#F26A1B;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Confirm receipt →</a><p style="color:#6b7280;font-size:13px;margin-top:24px">If you have any questions, please reach out through the platform support.</p><p style="color:#6b7280;font-size:13px">The One Talky Team 🧡</p></div>`;
  if (id === "lesson_tutor") return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#030309;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#030309;padding:40px 20px;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f0f1f,#1a0a2e);border-radius:20px;overflow:hidden;border:1px solid rgba(139,92,246,0.25);"><tr><td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 36px;text-align:center;"><div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 16px;margin-bottom:16px;"><span style="font-size:24px;">🎙️</span></div><h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">OneTalky</h1><p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Language conversation platform</p></td></tr><tr><td style="padding:36px 36px 28px;"><p style="margin:0 0 8px;color:#a78bfa;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">⏰ Lesson Reminder</p><h2 style="margin:0 0 20px;color:#ffffff;font-size:20px;font-weight:700;">Hi, Maria Silva!</h2><p style="margin:0 0 24px;color:#c4b5fd;font-size:15px;line-height:1.6;">Your lesson with <strong style="color:#ffffff;">João Santos</strong> starts in <strong style="color:#a78bfa;">1 hour</strong>. Get ready! 🚀</p><div style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:20px 22px;margin-bottom:24px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:12px;">👤 Student</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">João Santos</span></td></tr><tr><td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr><tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:12px;">📅 Date & Time (Brasília time)</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">${now}</span></td></tr></table></div><div style="text-align:center;"><a href="https://onetalky.base44.app/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:600;font-size:14px;">Go to the platform →</a></div></td></tr><tr><td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;"><p style="margin:0;color:#4b5563;font-size:11px;">OneTalky · You are receiving this email because you have an upcoming lesson.</p></td></tr></table></td></tr></table></body></html>`;
  if (id === "lesson_student") return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#030309;font-family:'Segoe UI',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#030309;padding:40px 20px;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f0f1f,#0a1a2e);border-radius:20px;overflow:hidden;border:1px solid rgba(99,102,241,0.25);"><tr><td style="background:linear-gradient(135deg,#4f46e5,#0ea5e9);padding:32px 36px;text-align:center;"><div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 16px;margin-bottom:16px;"><span style="font-size:24px;">💬</span></div><h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">OneTalky</h1><p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Language conversation platform</p></td></tr><tr><td style="padding:36px 36px 28px;"><p style="margin:0 0 8px;color:#818cf8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">⏰ Your lesson is coming up!</p><h2 style="margin:0 0 20px;color:#ffffff;font-size:20px;font-weight:700;">Hi, João Santos!</h2><p style="margin:0 0 24px;color:#c7d2fe;font-size:15px;line-height:1.6;">Your lesson with tutor <strong style="color:#ffffff;">Maria Silva</strong> starts in <strong style="color:#818cf8;">30 minutes</strong>. Log in and get ready! 🌟</p><div style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);border-radius:14px;padding:20px 22px;margin-bottom:24px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:12px;">🎙️ Tutor</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">Maria Silva</span></td></tr><tr><td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr><tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:12px;">📅 Date & Time (Brasília time)</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">${now}</span></td></tr></table></div><div style="text-align:center;"><a href="https://onetalky.base44.app/dashboard" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#0ea5e9);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:600;font-size:14px;">Enter the platform →</a></div></td></tr><tr><td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;"><p style="margin:0;color:#4b5563;font-size:11px;">OneTalky · You are receiving this email because you have a scheduled lesson.</p></td></tr></table></td></tr></table></body></html>`;
  return "";
}

export default function AdminEmail() {
  const [testTo, setTestTo] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("lesson_tutor");
  const [sending, setSending] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [reminderResult, setReminderResult] = useState(null);
  const [tutorMinutes, setTutorMinutes] = useState(60);
  const [studentMinutes, setStudentMinutes] = useState(30);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const handleTestEmail = async () => {
    if (!testTo) return toast({ title: "Enter a recipient email", variant: "destructive" });
    setSending(true);
    setTestResult(null);
    const tpl = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate);
    try {
      const res = await base44.functions.invoke("sendEmail", {
        to: testTo,
        subject: tpl.subject,
        html: getTemplateHtml(selectedTemplate),
      });
      setTestResult({ ok: true, data: res.data });
      toast({ title: "Test email sent!" });
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
      toast({ title: "Error sending", description: e.message, variant: "destructive" });
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

  const tutorTemplateHtml = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030309;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030309;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f0f1f,#1a0a2e);border-radius:20px;overflow:hidden;border:1px solid rgba(139,92,246,0.25);">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 36px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 16px;margin-bottom:16px;"><span style="font-size:24px;">🎙️</span></div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">OneTalky</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Plataforma de conversação em idiomas</p>
        </td></tr>
        <tr><td style="padding:36px 36px 28px;">
          <p style="margin:0 0 8px;color:#a78bfa;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">⏰ Lembrete de Aula</p>
          <h2 style="margin:0 0 20px;color:#ffffff;font-size:20px;font-weight:700;">Olá, Maria Silva!</h2>
          <p style="margin:0 0 24px;color:#c4b5fd;font-size:15px;line-height:1.6;">
            Sua aula com <strong style="color:#ffffff;">João Santos</strong> começa em <strong style="color:#a78bfa;">1 hora</strong>. Prepare-se! 🚀
          </p>
          <div style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:20px 22px;margin-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:12px;">👤 Aluno</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">João Santos</span></td></tr>
              <tr><td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
              <tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:12px;">📅 Data e hora (horário de Brasília)</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">sexta-feira, 17 de julho de 2026, 21:00</span></td></tr>
            </table>
          </div>
          <div style="text-align:center;">
            <a href="#" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:600;font-size:14px;">Acessar a plataforma →</a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;color:#4b5563;font-size:11px;">OneTalky · Você está recebendo este e-mail porque é tutor da plataforma.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const studentTemplateHtml = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#030309;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030309;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f0f1f,#0a1a2e);border-radius:20px;overflow:hidden;border:1px solid rgba(99,102,241,0.25);">
        <tr><td style="background:linear-gradient(135deg,#4f46e5,#0ea5e9);padding:32px 36px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 16px;margin-bottom:16px;"><span style="font-size:24px;">💬</span></div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">OneTalky</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Plataforma de conversação em idiomas</p>
        </td></tr>
        <tr><td style="padding:36px 36px 28px;">
          <p style="margin:0 0 8px;color:#818cf8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">⏰ Sua aula está chegando!</p>
          <h2 style="margin:0 0 20px;color:#ffffff;font-size:20px;font-weight:700;">Olá, João Santos!</h2>
          <p style="margin:0 0 24px;color:#c7d2fe;font-size:15px;line-height:1.6;">
            Sua aula com o tutor <strong style="color:#ffffff;">Maria Silva</strong> começa em <strong style="color:#818cf8;">30 minutos</strong>. Acesse a plataforma e esteja pronto! 🌟
          </p>
          <div style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.25);border-radius:14px;padding:20px 22px;margin-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:12px;">🎙️ Tutor</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">Maria Silva</span></td></tr>
              <tr><td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
              <tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:12px;">📅 Data e hora (horário de Brasília)</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">sexta-feira, 17 de julho de 2026, 21:00</span></td></tr>
            </table>
          </div>
          <div style="text-align:center;">
            <a href="#" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#0ea5e9);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:600;font-size:14px;">Entrar na plataforma →</a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;color:#4b5563;font-size:11px;">OneTalky · Você está recebendo este e-mail porque tem uma aula agendada.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl theme-heading text-white mb-1">E-mail & Lembretes</h1>
      <p className="theme-subtext text-gray-500 text-sm mb-8">Configure e teste o envio de e-mails via SMTP.</p>

      {/* Template Preview */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
        <h2 className="font-semibold theme-heading text-white text-sm mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-violet-400" /> Preview dos Templates de Lembrete
        </h2>
        <p className="text-xs text-gray-500 mb-4">Veja como tutores e alunos receberão os lembretes de aula.</p>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setPreviewTemplate(previewTemplate === 'tutor' ? null : 'tutor')}
            className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${previewTemplate === 'tutor' ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-violet-500/40'}`}
          >
            🎙️ Template Tutor
          </button>
          <button
            onClick={() => setPreviewTemplate(previewTemplate === 'student' ? null : 'student')}
            className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${previewTemplate === 'student' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:border-indigo-500/40'}`}
          >
            💬 Template Aluno
          </button>
        </div>

        {previewTemplate === 'tutor' && (
          <div className="rounded-xl overflow-hidden border border-white/10">
            <iframe
              srcDoc={tutorTemplateHtml}
              className="w-full"
              style={{ height: 520, border: 'none' }}
              title="Preview tutor email"
            />
          </div>
        )}
        {previewTemplate === 'student' && (
          <div className="rounded-xl overflow-hidden border border-white/10">
            <iframe
              srcDoc={studentTemplateHtml}
              className="w-full"
              style={{ height: 520, border: 'none' }}
              title="Preview student email"
            />
          </div>
        )}
      </div>

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
          <Send className="w-4 h-4 text-violet-400" /> Send test email
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Recipient</label>
            <Input value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="email@example.com" type="email" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Email template</label>
            <div className="grid grid-cols-2 gap-2">
              {EMAIL_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    selectedTemplate === tpl.id
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-violet-500/40"
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleTestEmail} disabled={sending} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
            {sending ? "Sending..." : "Send test email"}
          </Button>
          {testResult && (
            <div className={`text-xs p-3 rounded-lg flex items-start gap-2 ${testResult.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {testResult.ok ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{testResult.ok ? `Sent! ID: ${testResult.data?.messageId}` : testResult.error}</span>
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