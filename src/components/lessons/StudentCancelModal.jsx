import React, { useState } from "react";
import { X, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
      return { canCancel: false, warning: "Cancellation window has passed. Since this lesson was booked with less than 24h notice, you had 1 hour to cancel after booking." };
    }
    return { canCancel: true, warning: `Since this lesson was booked with less than 24 hours notice, you can cancel for up to 1 hour after booking (${Math.floor(hoursUntilLesson)}h ${Math.round((hoursUntilLesson % 1) * 60)}min remaining).` };
  }

  // Normal: must cancel at least 24h before lesson
  if (hoursUntilLesson < 24) {
    return { canCancel: false, warning: "Cancellation window has passed. You must cancel at least 24 hours before the lesson. Your minutes will be charged." };
  }
  return { canCancel: true, warning: null };
}

export default function StudentCancelModal({ lesson, onClose, onCancel, loading }) {
  const [message, setMessage] = useState("");
  const { canCancel, warning } = getCancelDeadlineInfo(lesson);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-gray-900 text-lg">Cancel Lesson</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Cancel your lesson with <strong className="text-gray-800">{lesson.tutor_name}</strong>?
          </p>

          {warning && (
            <div className={`flex gap-2 p-3 rounded-xl text-sm ${canCancel ? "bg-amber-50 border border-amber-200 text-amber-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
              {canCancel ? <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />}
              <span>{warning}</span>
            </div>
          )}

          {canCancel && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Message to tutor (optional)
                </label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. Something came up, sorry for the short notice!"
                  className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 resize-none h-24"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={onClose} className="flex-1 rounded-2xl border-gray-200 text-gray-600">
                  Keep lesson
                </Button>
                <Button
                  onClick={() => onCancel(message)}
                  disabled={loading}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-lg shadow-red-500/20"
                >
                  {loading ? "Cancelling..." : "Cancel lesson"}
                </Button>
              </div>
            </>
          )}

          {!canCancel && (
            <Button variant="outline" onClick={onClose} className="w-full rounded-2xl border-gray-200 text-gray-600">
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}