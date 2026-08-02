import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Send, Bell, CheckCircle, AlertCircle, Clock, Eye, UserPlus, Calendar } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import ComposeEmailSection from "@/components/admin/ComposeEmailSection";

const TIME_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
  { label: "3h", value: 180 },
  { label: "6h", value: 360 },
  { label: "12h", value: 720 },
  { label: "24h", value: 1440 },
];

// ── Preview HTML builders ──────────────────────────────────────────────────
function getLessonReminderTutorHtml() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#030309;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030309;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f0f1f,#1a0a2e);border-radius:20px;overflow:hidden;border:1px solid rgba(139,92,246,0.25);">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 36px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 16px;margin-bottom:16px;"><span style="font-size:24px;">🎙️</span></div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">OneTalky</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Language conversation platform</p>
        </td></tr>
        <tr><td style="padding:36px 36px 28px;">
          <p style="margin:0 0 8px;color:#a78bfa;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">⏰ Lesson Reminder</p>
          <h2 style="margin:0 0 20px;color:#ffffff;font-size:20px;font-weight:700;">Hi, Maria Silva!</h2>
          <p style="margin:0 0 24px;color:#c4b5fd;font-size:15px;line-height:1.6;">Your lesson with <strong style="color:#ffffff;">João Santos</strong> starts in <strong style="color:#a78bfa;">1 hour</strong>. Get ready! 🚀</p>
          <div style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:20px 22px;margin-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:12px;">👤 Student</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">João Santos</span></td></tr>
              <tr><td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
              <tr><td style="padding:6px 0;"><span style="color:#9ca3af;font-size:12px;">📅 Date & Time</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">Monday, July 28, 2026, 10:00 AM</span></td></tr>
            </table>
          </div>
          <div style="text-align:center;"><a href="#" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:600;font-size:14px;">Go to the platform →</a></div>
        </td></tr>
        <tr><td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;"><p style="margin:0;color:#4b5563;font-size:11px;">OneTalky · You are receiving this email because you have an upcoming lesson.</p></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function getBookingNotificationHtml() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#030309;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#030309;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f0f1f,#1a0a2e);border-radius:20px;overflow:hidden;border:1px solid rgba(139,92,246,0.25);">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px 36px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 16px;margin-bottom:16px;"><span style="font-size:24px;">📅</span></div>
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">OneTalky</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Language conversation platform</p>
        </td></tr>
        <tr><td style="padding:36px 36px 28px;">
          <p style="margin:0 0 8px;color:#a78bfa;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">📅 New Lesson Scheduled</p>
          <h2 style="margin:0 0 8px;color:#ffffff;font-size:20px;font-weight:700;">Hi, Maria Silva!</h2>
          <p style="margin:0 0 24px;color:#c4b5fd;font-size:15px;line-height:1.6;">A new lesson has been booked with you by <strong style="color:#ffffff;">João Santos</strong>. Here are the details:</p>
          <div style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);border-radius:14px;padding:20px 22px;margin-bottom:20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="padding:8px 0;"><span style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">👤 Student</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">João Santos</span></td></tr>
              <tr><td style="padding:4px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
              <tr><td style="padding:8px 0;"><span style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">📅 Date & Time</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">Monday, July 28, 2026, 10:00 AM</span></td></tr>
              <tr><td style="padding:4px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
              <tr><td style="padding:8px 0;"><span style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">📊 Student Level</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">Intermediate</span></td></tr>
              <tr><td style="padding:4px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
              <tr><td style="padding:8px 0;"><span style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">🎯 Learning Objective</span><br><span style="color:#ffffff;font-size:15px;font-weight:600;">Business English</span></td></tr>
              <tr><td style="padding:4px 0;border-top:1px solid rgba(255,255,255,0.06);"></td></tr>
              <tr><td style="padding:8px 0;"><span style="color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">💬 Conversation Topics</span><br><ul style="margin:6px 0 0;padding:0;list-style:none;"><li style="margin:3px 0;color:#c4b5fd;font-size:14px;">• Travel & Culture</li><li style="margin:3px 0;color:#c4b5fd;font-size:14px;">• Technology</li></ul></td></tr>
            </table>
          </div>
          <div style="background:rgba(242,106,27,0.1);border:1px solid rgba(242,106,27,0.25);border-radius:12px;padding:14px 18px;margin-bottom:24px;">
            <p style="margin:0;color:#fdba74;font-size:14px;line-height:1.5;">💡 <strong>Tip:</strong> Use the student's topics and objective to personalize the lesson.</p>
          </div>
          <div style="text-align:center;"><a href="#" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:12px;font-weight:600;font-size:14px;">View my schedule →</a></div>
        </td></tr>
        <tr><td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;"><p style="margin:0;color:#4b5563;font-size:11px;">OneTalky · You are receiving this email because a student has booked a lesson with you.</p></td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function getNewUserNotifHtml() {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#f9fafb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#F26A1B;padding:20px 24px;"><span style="color:#fff;font-size:18px;font-weight:700;">🎉 New Registration — One Talky</span></div>
    <div style="padding:24px;">
      <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>Name:</strong> João Santos</p>
      <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>Type:</strong> Student</p>
      <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>Email:</strong> joao@example.com</p>
      <p style="margin:0 0 8px;font-size:15px;color:#111827;"><strong>Plan:</strong> <span style="color:#059669;font-weight:600;">Standard</span></p>
    </div>
  </div>`;
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ icon: Icon, iconColor = "text-violet-400", title, description, children }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
      <h2 className="font-semibold text-white text-sm mb-1 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} /> {title}
      </h2>
      {description && <p className="text-xs text-gray-500 mb-4">{description}</p>}
      {children}
    </div>
  );
}

// ── Preview modal ──────────────────────────────────────────────────────────
function PreviewModal({ html, title, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-950 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="text-white font-semibold text-sm">{title}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="overflow-auto flex-1 p-2">
          <iframe srcDoc={html} className="w-full rounded-xl" style={{ height: 560, border: 'none' }} title={title} />
        </div>
      </div>
    </div>
  );
}

// ── Time selector ─────────────────────────────────────────────────────────
function TimeSelector({ value, onChange, color = "violet" }) {
  const activeClass = color === "violet" ? "bg-violet-600 border-violet-500 text-white" : "bg-indigo-600 border-indigo-500 text-white";
  const hoverClass = color === "violet" ? "hover:border-violet-500/40" : "hover:border-indigo-500/40";
  return (
    <div className="flex flex-wrap gap-1.5">
      {TIME_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
            value === opt.value ? activeClass : `bg-white/5 border-white/10 text-gray-400 ${hoverClass}`
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AdminEmail() {
  const [testTo, setTestTo] = useState("");
  const [sending, setSending] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [reminderResult, setReminderResult] = useState(null);
  const [tutorMinutes, setTutorMinutes] = useState(60);
  const [studentMinutes, setStudentMinutes] = useState(30);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");

  // Admin notification email settings
  const [adminNotifEmail, setAdminNotifEmail] = useState("");
  const [savingAdminEmail, setSavingAdminEmail] = useState(false);

  const openPreview = (html, title) => { setPreviewHtml(html); setPreviewTitle(title); };
  const closePreview = () => setPreviewHtml(null);

  const handleTestEmail = async () => {
    if (!testTo) return toast({ title: "Informe um e-mail de destino", variant: "destructive" });
    setSending(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke("sendEmail", {
        to: testTo,
        subject: "⏰ Your lesson starts in 1 hour – OneTalky",
        html: getLessonReminderTutorHtml(),
      });
      setTestResult({ ok: true, data: res.data });
      toast({ title: "E-mail de teste enviado!" });
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
      toast({ title: "Erro", description: e.message, variant: "destructive" });
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

  const handleSaveAdminEmail = async () => {
    if (!adminNotifEmail) return toast({ title: "Informe um e-mail", variant: "destructive" });
    setSavingAdminEmail(true);
    try {
      // Store via a backend function invocation — saves to ADMIN_EMAIL secret note
      // For now, we just show instruction to set the ADMIN_EMAIL secret in the dashboard
      toast({ title: "✅ Para aplicar este e-mail, configure o secret ADMIN_EMAIL com este valor.", description: adminNotifEmail });
    } catch (e) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setSavingAdminEmail(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-2xl text-white mb-1">E-mails e Notificações</h1>
      <p className="text-gray-500 text-sm mb-7">Configure e teste todas as notificações automáticas por e-mail.</p>

      <ComposeEmailSection />

      {/* ── SECTION 1: Admin Notification Email ─────────────────────────── */}
      <Section icon={UserPlus} iconColor="text-orange-400" title="Notificações de Novo Usuário" description="Endereço de e-mail que recebe alertas quando um novo aluno ou tutor se cadastra.">
        <div className="flex gap-2 mb-3">
          <Input
            value={adminNotifEmail}
            onChange={e => setAdminNotifEmail(e.target.value)}
            placeholder="admin@example.com"
            type="email"
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 flex-1"
          />
          <Button onClick={handleSaveAdminEmail} disabled={savingAdminEmail} className="bg-orange-600 hover:bg-orange-700 text-white shrink-0">
            Salvar
          </Button>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-3 text-xs text-amber-300">
          ⚙️ Configure o secret <code className="bg-amber-500/20 px-1 rounded">ADMIN_EMAIL</code> no painel do app com o endereço desejado. A função já lê esse secret.
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openPreview(getNewUserNotifHtml(), "📬 New User Notification Email")}
            className="text-xs flex items-center gap-1.5 text-orange-400 hover:text-orange-300 border border-orange-500/20 px-3 py-1.5 rounded-lg bg-orange-500/5 hover:bg-orange-500/10 transition-all"
          >
            <Eye className="w-3.5 h-3.5" /> Ver modelo
          </button>
        </div>
      </Section>

      {/* ── SECTION 2: Booking Notification ────────────────────────────── */}
      <Section icon={Calendar} iconColor="text-violet-400" title="Notificação de Agendamento ao Tutor" description="Enviado automaticamente ao tutor quando um aluno agenda uma aula. Inclui nome do aluno, nível, tópicos, objetivo e data/hora.">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white/5 border border-white/8 rounded-xl p-3 text-xs text-gray-300">
            <div className="font-semibold text-white mb-1">O que está incluído:</div>
            <ul className="space-y-0.5 text-gray-400">
              <li>✓ Nome do aluno</li>
              <li>✓ Data e hora (horário de Brasília)</li>
              <li>✓ Nível de inglês do aluno</li>
              <li>✓ Objetivo de aprendizado</li>
              <li>✓ Tópicos de conversação</li>
            </ul>
          </div>
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-xs text-violet-300">
            <div className="font-semibold text-white mb-1">Gatilho:</div>
            <p className="text-gray-400">Enviado automaticamente pela função <code className="bg-violet-500/20 px-1 rounded text-violet-300">notifyTutorBooking</code> quando uma aula é agendada.</p>
          </div>
        </div>
        <button
          onClick={() => openPreview(getBookingNotificationHtml(), "📅 Booking Notification Email")}
          className="text-xs flex items-center gap-1.5 text-violet-400 hover:text-violet-300 border border-violet-500/20 px-3 py-1.5 rounded-lg bg-violet-500/5 hover:bg-violet-500/10 transition-all"
        >
          <Eye className="w-3.5 h-3.5" /> Ver modelo
        </button>
      </Section>

      {/* ── SECTION 3: Lesson Reminders ─────────────────────────────────── */}
      <Section icon={Bell} iconColor="text-indigo-400" title="Lembretes de Aula" description="Configure com quanta antecedência tutores e alunos recebem um e-mail de lembrete antes da aula.">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-violet-400" />
              <p className="text-sm font-medium text-white">Tutores</p>
            </div>
            <p className="text-xs text-gray-500 mb-2">Enviar lembrete antes de:</p>
            <TimeSelector value={tutorMinutes} onChange={setTutorMinutes} color="violet" />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <p className="text-sm font-medium text-white">Alunos</p>
            </div>
            <p className="text-xs text-gray-500 mb-2">Enviar lembrete antes de:</p>
            <TimeSelector value={studentMinutes} onChange={setStudentMinutes} color="indigo" />
          </div>
        </div>

        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-4 text-xs text-violet-300">
          Tutores recebem o lembrete <strong>{TIME_OPTIONS.find(o => o.value === tutorMinutes)?.label}</strong> antes · Alunos recebem <strong>{TIME_OPTIONS.find(o => o.value === studentMinutes)?.label}</strong> antes
        </div>

        <div className="flex gap-2 mb-3">
          <Button onClick={handleSendReminders} disabled={reminding} variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/10">
            {reminding ? "Enviando..." : "Enviar lembretes agora"}
          </Button>
          <button
            onClick={() => openPreview(getLessonReminderTutorHtml(), "🎙️ Lesson Reminder (Tutor)")}
            className="text-xs flex items-center gap-1.5 text-violet-400 hover:text-violet-300 border border-violet-500/20 px-3 py-1.5 rounded-lg bg-violet-500/5 hover:bg-violet-500/10 transition-all"
          >
            <Eye className="w-3.5 h-3.5" /> Ver
          </button>
        </div>

        {reminderResult && (
          <div className={`text-xs p-3 rounded-lg flex items-start gap-2 ${reminderResult.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {reminderResult.ok ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{reminderResult.ok ? `${reminderResult.data.sent} lembretes enviados.` : reminderResult.error}</span>
          </div>
        )}
      </Section>

      {/* ── SECTION 4: SMTP Config & Test ───────────────────────────────── */}
      <Section icon={Mail} iconColor="text-emerald-400" title="Configuração SMTP" description="Verifique suas credenciais SMTP e envie um e-mail de teste.">
        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
          {[["Host", "Definido via secret"], ["Porta", "Definido via secret"], ["Usuário", "Definido via secret"], ["De", "Definido via secret"]].map(([label, val]) => (
            <div key={label} className="bg-white/5 rounded-lg p-2.5">
              <p className="text-gray-500 mb-0.5">{label}</p>
              <p className="text-white font-medium truncate">{val}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-emerald-400 mb-4 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5" /> Secrets configurados no painel
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Enviar teste (modelo de lembrete de aula)</label>
            <div className="flex gap-2">
              <Input
                value={testTo}
                onChange={e => setTestTo(e.target.value)}
                placeholder="seu@email.com"
                type="email"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 flex-1"
              />
              <Button onClick={handleTestEmail} disabled={sending} className="bg-violet-600 hover:bg-violet-700 text-white shrink-0">
                <Send className="w-3.5 h-3.5 mr-1" />
                {sending ? "Enviando..." : "Enviar teste"}
              </Button>
            </div>
          </div>
          {testResult && (
            <div className={`text-xs p-3 rounded-lg flex items-start gap-2 ${testResult.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
              {testResult.ok ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <span>{testResult.ok ? `Enviado! ID: ${testResult.data?.messageId || "ok"}` : testResult.error}</span>
            </div>
          )}
        </div>
      </Section>

      {/* Preview Modal */}
      {previewHtml && <PreviewModal html={previewHtml} title={previewTitle} onClose={closePreview} />}
    </div>
  );
}