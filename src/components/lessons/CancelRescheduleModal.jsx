import React, { useState } from "react";
import { X, Send, Calendar, ChevronLeft, ChevronRight, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

export default function CancelRescheduleModal({ lesson, tutorAvailability, bookedSlots = [], onClose, onCancel, onReschedule, loading }) {
  const [tab, setTab] = useState("cancel"); // "cancel" | "reschedule"
  const [proposed, setProposed] = useState(false);
  const [message, setMessage] = useState("");
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const availability = tutorAvailability || {};

  const bookedSet = new Set(
    (bookedSlots || []).map(iso => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    })
  );

  const isSlotBooked = (date, slot) => {
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")} ${slot}`;
    return bookedSet.has(key);
  };

  const getSlotsForDate = (date) => {
    if (!date) return [];
    const dayName = DAYS_OF_WEEK[date.getDay()];
    return (availability[dayName] || []).filter(slot => !isSlotBooked(date, slot));
  };

  const isDateAvailable = (date) => {
    if (!date) return false;
    const d = new Date(date); d.setHours(0,0,0,0);
    const t = new Date(); t.setHours(0,0,0,0);
    if (d < t) return false;
    return getSlotsForDate(date).length > 0;
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null); setSelectedSlot(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null); setSelectedSlot(null);
  };

  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();
  const calendarDays = buildCalendarDays(viewYear, viewMonth);
  const slots = getSlotsForDate(selectedDate);

  const handleReschedule = async () => {
    if (!selectedDate || !selectedSlot) return;
    const [hours, minutes] = selectedSlot.split(":").map(Number);
    const scheduled = new Date(selectedDate);
    scheduled.setHours(hours, minutes, 0, 0);
    const ok = await onReschedule(scheduled.toISOString(), message);
    if (ok) setProposed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="font-display font-bold text-gray-900 text-lg">Manage Lesson</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0">
          <button
            onClick={() => setTab("cancel")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === "cancel" ? "text-red-600 border-b-2 border-red-500" : "text-gray-400 hover:text-gray-600"}`}
          >
            Cancel lesson
          </button>
          <button
            onClick={() => setTab("reschedule")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === "reschedule" ? "text-violet-600 border-b-2 border-violet-500" : "text-gray-400 hover:text-gray-600"}`}
          >
            Reschedule
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === "cancel" && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Send an optional message to <strong className="text-gray-800">{lesson.student_name}</strong> explaining the cancellation or suggesting a new time.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Message to student (optional)</label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. Sorry, I need to reschedule. How about Thursday at 3pm?"
                  className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 resize-none h-28"
                />
              </div>
              <div className="flex gap-3 pt-2">
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
            </div>
          )}

          {tab === "reschedule" && (
            <div className="p-6 space-y-4">
              {proposed ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center mx-auto">
                    <Clock className="w-7 h-7 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-gray-800 text-lg mb-1">Aguardando resposta do aluno</p>
                    <p className="text-sm text-gray-500">O aluno foi notificado e pode aceitar ou recusar o novo horário na plataforma.</p>
                  </div>
                  <Button onClick={onClose} className="rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 border-0">
                    Close
                  </Button>
                </div>
              ) : (
                <>
              <p className="text-sm text-gray-500">Pick a new date and time for <strong className="text-gray-800">{lesson.student_name}</strong>'s lesson.</p>

              {/* Calendar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={prevMonth} disabled={!canGoPrev}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 disabled:opacity-30 hover:bg-gray-200 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                  </button>
                  <span className="font-bold text-gray-800 text-sm">{MONTH_NAMES[viewMonth]} {viewYear}</span>
                  <button onClick={nextMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {DAY_LABELS.map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide py-1 text-gray-400">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date, idx) => {
                    if (!date) return <div key={`e-${idx}`} />;
                    const available = isDateAvailable(date);
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const isPast = (() => { const d = new Date(date); d.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); return d < t; })();
                    return (
                      <button key={idx} onClick={() => { if (available) { setSelectedDate(date); setSelectedSlot(null); } }}
                        disabled={!available}
                        className={`relative h-9 w-full flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all
                          ${isSelected ? "bg-violet-600 text-white" : ""}
                          ${!isSelected && available ? "hover:bg-violet-100 text-gray-700" : ""}
                          ${isPast || !available ? "opacity-25 cursor-not-allowed text-gray-400" : ""}
                        `}>
                        {date.getDate()}
                        {available && !isSelected && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-violet-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slots */}
              {selectedDate && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700">
                      {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {slots.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-3">No available slots</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {slots.map(slot => (
                        <button key={slot} onClick={() => setSelectedSlot(slot)}
                          className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                            selectedSlot === slot
                              ? "bg-violet-600 text-white border-violet-600"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:border-violet-400 hover:text-violet-600"
                          }`}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Message to student (optional)</label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. I need to move our lesson, hope this new time works for you!"
                  className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400 resize-none h-20"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1 rounded-2xl border-gray-200 text-gray-600">Cancel</Button>
                <Button
                  onClick={handleReschedule}
                  disabled={!selectedDate || !selectedSlot || loading}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 disabled:opacity-40"
                >
                  {loading ? "Saving..." : <><Check className="w-4 h-4 mr-1" /> Propose</>}
                </Button>
              </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}