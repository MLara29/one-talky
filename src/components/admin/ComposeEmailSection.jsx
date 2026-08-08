import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, CheckCircle, AlertCircle, Users, User as UserIcon } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import RecipientPicker from "./RecipientPicker";
import EmailAttachmentsInput from "./EmailAttachmentsInput";

const TARGETS = [
  { value: "specific_tutor", label: "Um tutor específico", icon: UserIcon },
  { value: "specific_student", label: "Um aluno específico", icon: UserIcon },
  { value: "all_tutors", label: "Todos os tutores", icon: Users },
  { value: "all_students", label: "Todos os alunos", icon: Users },
];

// Converte texto colado (quebras de linha e **negrito** estilo markdown)
// para HTML antes de enviar — não altera o que se vê digitando.
const convertToHtml = (text) => {
  if (!text) return "";
  // Escapa HTML real que porventura já exista no texto colado
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // **negrito** → <strong>negrito</strong>
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Quebra dupla de linha (parágrafo) → </p><p>, quebra simples → <br>
  const paragraphs = withBold.split("\n\n").map(p =>
    `<p style="margin: 0 0 12px;">${p.replace(/\n/g, "<br>")}</p>`
  ).join("");
  return paragraphs;
};

export default function ComposeEmailSection() {
  const [target, setTarget] = useState("specific_tutor");
  const [recipient, setRecipient] = useState(null);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const isBulk = target === "all_tutors" || target === "all_students";
  const canSend = subject.trim() && bodyHtml.trim() && (!["specific_tutor", "specific_student"].includes(target) || recipient);

  const changeTarget = (t) => {
    setTarget(t);
    setRecipient(null);
    setResult(null);
  };

  const doSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("adminSendCustomEmail", {
        target,
        recipient_id: recipient?.id,
        subject,
        body_html: convertToHtml(bodyHtml),
        attachments: attachments.map(({ filename, content_type, content_base64 }) => ({ filename, content_type, content_base64 })),
      });
      setResult({ ok: true, data: res.data });
      toast({ title: `Enviado para ${res.data.sent} destinatário(s)` });
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      setResult({ ok: false, error: msg });
      toast({ title: "Erro ao enviar", description: msg, variant: "destructive" });
    }
    setSending(false);
    setConfirming(false);
  };

  const handleSendClick = () => {
    if (isBulk) {
      setConfirming(true);
    } else {
      doSend();
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
      <h2 className="font-semibold text-white text-sm mb-1 flex items-center gap-2">
        <Send className="w-4 h-4 text-emerald-400" /> Enviar E-mail
      </h2>
      <p className="text-xs text-gray-500 mb-4">Componha e envie um e-mail para um usuário específico ou em massa, com anexos.</p>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Destinatário</label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            {TARGETS.map((t) => (
              <button
                key={t.value}
                onClick={() => changeTarget(t.value)}
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-all ${
                  target === t.value
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-emerald-500/40"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>
          {target === "specific_tutor" && <RecipientPicker role="tutor" value={recipient} onChange={setRecipient} />}
          {target === "specific_student" && <RecipientPicker role="student" value={recipient} onChange={setRecipient} />}
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Assunto</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Assunto do e-mail"
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Corpo do e-mail</label>
          <Textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            placeholder="Digite ou cole o texto normalmente — quebras de linha e **negrito** (com dois asteriscos) são convertidos automaticamente."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 min-h-[160px]"
          />
          <div className="mt-2 p-3 rounded-lg bg-white border border-white/10">
            <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wide">Prévia</p>
            <div
              className="text-sm text-gray-800"
              dangerouslySetInnerHTML={{ __html: convertToHtml(bodyHtml) }}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Anexos</label>
          <EmailAttachmentsInput
            attachments={attachments}
            onChange={setAttachments}
            onError={(msg) => toast({ title: msg, variant: "destructive" })}
          />
        </div>

        {!confirming ? (
          <Button onClick={handleSendClick} disabled={!canSend || sending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
            <Send className="w-4 h-4 mr-1.5" /> Enviar
          </Button>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-2">
            <p className="text-xs text-amber-300">
              Isso enviará o e-mail para <strong>{target === "all_tutors" ? "todos os tutores" : "todos os alunos"}</strong> da plataforma. Confirma o envio?
            </p>
            <div className="flex gap-2">
              <Button onClick={doSend} disabled={sending} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs">
                {sending ? "Enviando..." : "Sim, enviar para todos"}
              </Button>
              <Button onClick={() => setConfirming(false)} variant="outline" className="border-white/10 text-white hover:bg-white/10 text-xs">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className={`text-xs p-3 rounded-lg flex items-start gap-2 ${result.ok ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {result.ok ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>
              {result.ok
                ? `Enviado para ${result.data.sent} de ${result.data.sent + result.data.failed.length} destinatário(s).${result.data.failed.length > 0 ? ` ${result.data.failed.length} falharam: ${result.data.failed.join(", ")}` : ""}`
                : result.error}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}