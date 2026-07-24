import React, { useState } from "react";
import { X, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { t } from "@/lib/i18n";

function getCancelDeadlineInfo(lesson) {
  if (!lesson.scheduled_at) return { canCancel: true, warning: null };
  const now = new Date();
  const lessonAt = new Date(lesson.scheduled_at);
  const hoursUntilLesson = (lessonAt - now) / 3600000;
  const bookedAt = new Date(lesson.created_date || now);
  const hoursUntilLessonAtBooking = (lessonAt - bookedAt) / 3600000;

  // If lesson was booked with less than 24h notice → student has 1h to cancel
  if (hoursUntilLessonAtBooking < 24) {
    if (hoursUntilLesson < 1) {
      return { canCancel: false, isShortNotice: true };
    }
    return { canCancel: true, isShortNotice: true, hoursLeft: Math.floor(hoursUntilLesson) };
  }

  // Normal: must cancel at least 24h before lesson
  if (hoursUntilLesson < 24) {
    return { canCancel: false, isShortNotice: false };
  }
  return { canCancel: true, isShortNotice: false };
}

const CANCEL_MSGS = {
  en: {
    blockedNormal: "Cancellation window has passed. You must cancel at least 24 hours before the lesson. Your minutes will be charged.",
    blockedShort: "Cancellation window has passed. Since this lesson was booked with less than 24h notice, you had 1 hour to cancel after booking.",
    warnShort: (h) => `This lesson was booked with less than 24 hours notice. You can still cancel (${h}h remaining), but only within 1 hour of booking.`,
  },
  pt_br: {
    blockedNormal: "Prazo de cancelamento encerrado. Você deve cancelar com pelo menos 24 horas de antecedência. Seus minutos serão descontados.",
    blockedShort: "Prazo de cancelamento encerrado. Como esta aula foi agendada com menos de 24h de antecedência, você tinha 1 hora após o agendamento para cancelar.",
    warnShort: (h) => `Esta aula foi agendada com menos de 24h de antecedência. Você ainda pode cancelar (${h}h restantes), mas apenas dentro de 1 hora após o agendamento.`,
  },
  pt_pt: {
    blockedNormal: "Prazo de cancelamento encerrado. Deve cancelar com pelo menos 24 horas de antecedência. Os seus minutos serão descontados.",
    blockedShort: "Prazo de cancelamento encerrado. Como esta aula foi agendada com menos de 24h de antecedência, tinha 1 hora após o agendamento para cancelar.",
    warnShort: (h) => `Esta aula foi agendada com menos de 24h de antecedência. Ainda pode cancelar (${h}h restantes), mas apenas dentro de 1 hora após o agendamento.`,
  },
  es: {
    blockedNormal: "El período de cancelación ha vencido. Debes cancelar con al menos 24 horas de anticipación. Tus minutos serán descontados.",
    blockedShort: "El período de cancelación ha vencido. Como esta clase se reservó con menos de 24h de anticipación, tenías 1 hora después de la reserva para cancelar.",
    warnShort: (h) => `Esta clase fue reservada con menos de 24h de anticipación. Aún puedes cancelar (${h}h restantes), pero solo dentro de 1 hora después de la reserva.`,
  },
  fr: {
    blockedNormal: "La fenêtre d'annulation est passée. Vous devez annuler au moins 24 heures avant la leçon. Vos minutes seront déduites.",
    blockedShort: "La fenêtre d'annulation est passée. Puisque cette leçon a été réservée avec moins de 24h de préavis, vous aviez 1 heure après la réservation pour annuler.",
    warnShort: (h) => `Cette leçon a été réservée avec moins de 24h de préavis. Vous pouvez encore annuler (${h}h restantes), mais seulement dans l'heure suivant la réservation.`,
  },
  de: {
    blockedNormal: "Das Stornierungsfenster ist abgelaufen. Du musst mindestens 24 Stunden vor der Lektion stornieren. Deine Minuten werden abgezogen.",
    blockedShort: "Das Stornierungsfenster ist abgelaufen. Da diese Lektion mit weniger als 24h Vorlauf gebucht wurde, hattest du 1 Stunde nach der Buchung Zeit zum Stornieren.",
    warnShort: (h) => `Diese Lektion wurde mit weniger als 24h Vorlauf gebucht. Du kannst noch stornieren (${h}h verbleibend), aber nur innerhalb einer Stunde nach der Buchung.`,
  },
  it: {
    blockedNormal: "La finestra di cancellazione è scaduta. Devi cancellare almeno 24 ore prima della lezione. I tuoi minuti verranno detratti.",
    blockedShort: "La finestra di cancellazione è scaduta. Poiché questa lezione è stata prenotata con meno di 24h di preavviso, avevi 1 ora dopo la prenotazione per cancellare.",
    warnShort: (h) => `Questa lezione è stata prenotata con meno di 24h di preavviso. Puoi ancora cancellare (${h}h rimanenti), ma solo entro 1 ora dalla prenotazione.`,
  },
};

export default function StudentCancelModal({ lesson, onClose, onCancel, loading, lang = "en" }) {
  const [message, setMessage] = useState("");
  const { canCancel, isShortNotice, hoursLeft } = getCancelDeadlineInfo(lesson);
  const msgs = CANCEL_MSGS[lang] || CANCEL_MSGS["en"];
  const T = (key) => t(lang, key);

  let warningMsg = null;
  let warningType = null;
  if (!canCancel) {
    warningMsg = isShortNotice ? msgs.blockedShort : msgs.blockedNormal;
    warningType = "error";
  } else if (canCancel && isShortNotice) {
    warningMsg = msgs.warnShort(hoursLeft || 0);
    warningType = "warn";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-gray-900 text-lg">{T("cancelLesson")}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            {T("cancelQuestion")} <strong className="text-gray-800">{lesson.tutor_name}</strong>?
          </p>

          {warningMsg && (
            <div className={`flex gap-2 p-3 rounded-xl text-sm ${warningType === "error" ? "bg-red-50 border border-red-200 text-red-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
              {warningType === "error"
                ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                : <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />}
              <span>{warningMsg}</span>
            </div>
          )}

          {canCancel && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  {T("msgToTutor")}
                </label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={T("msgPlaceholder")}
                  className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 resize-none h-24"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={onClose} className="flex-1 rounded-2xl border-gray-200 text-gray-600">
                  {T("keepLesson")}
                </Button>
                <Button
                  onClick={() => onCancel(message)}
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-lg shadow-red-500/20"
                >
                  {loading ? T("cancelling") : T("cancelLessonBtn")}
                </Button>
              </div>
            </>
          )}

          {!canCancel && (
            <Button variant="outline" onClick={onClose} className="w-full rounded-2xl border-gray-200 text-gray-600">
              {T("back")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}