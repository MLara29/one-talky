import React, { useState } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function ScheduleModal({ tutor, onClose, onConfirm, booking }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const availability = tutor.availability || {};

  const getSlotsForDate = (date) => {
    if (!date) return [];
    const dayName = DAYS_OF_WEEK[date.getDay()];
    return availability[dayName] || [];
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

  const handleDayClick = (date) => {
    if (!isDateAvailable(date)) return;
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleConfirm = () => {
    if (!selectedDate || !selectedSlot) return;
    const [hours, minutes] = selectedSlot.split(":").map(Number);
    const scheduled = new Date(selectedDate);
    scheduled.setHours(hours, minutes, 0, 0);
    onConfirm(scheduled.toISOString());
  };

  const calendarDays = buildCalendarDays(viewYear, viewMonth);
  const slots = getSlotsForDate(selectedDate);

  // Can we go back? Don't go before current month
  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="theme-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--app-border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <h2 className="theme-heading font-display font-bold text-white text-lg">Schedule a Lesson</h2>
          </div>
          <button
            onClick={onClose}
            className="theme-subtext w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Calendar */}
          <div>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                disabled={!canGoPrev}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                style={{ background: "var(--app-nav-hover-bg)" }}
              >
                <ChevronLeft className="w-4 h-4" style={{ color: "var(--app-text-secondary)" }} />
              </button>
              <h3 className="theme-heading font-display font-bold text-white text-base">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h3>
              <button
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ background: "var(--app-nav-hover-bg)" }}
              >
                <ChevronRight className="w-4 h-4" style={{ color: "var(--app-text-secondary)" }} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide py-1" style={{ color: "var(--app-text-muted)" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />;
                const available = isDateAvailable(date);
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                const isToday = date.toDateString() === today.toDateString();
                const isPast = (() => { const d = new Date(date); d.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); return d < t; })();

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClick(date)}
                    disabled={!available}
                    className={`
                      relative h-10 w-full flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all
                      ${isSelected ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30 scale-105" : ""}
                      ${!isSelected && available ? "hover:bg-violet-500/15 cursor-pointer" : ""}
                      ${isPast || !available ? "opacity-30 cursor-not-allowed" : ""}
                    `}
                  >
                    <span className={isToday && !isSelected ? "text-violet-500 font-bold" : isSelected ? "text-white" : ""}
                      style={{ color: isSelected ? undefined : (!available || isPast) ? "var(--app-text-muted)" : "var(--app-text-primary)" }}
                    >
                      {date.getDate()}
                    </span>
                    {available && !isSelected && (
                      <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-violet-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] mt-3 flex items-center gap-1.5" style={{ color: "var(--app-text-muted)" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500" />
              Days with available slots
            </p>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <div style={{ borderTop: "1px solid var(--app-border)" }} className="pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4" style={{ color: "var(--app-text-muted)" }} />
                  <span className="theme-heading font-semibold text-sm text-white">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </span>
                </div>
                {slots.length === 0 ? (
                  <p className="theme-subtext text-sm text-center py-3" style={{ color: "var(--app-text-muted)" }}>No slots available</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          selectedSlot === slot
                            ? "bg-violet-600 text-white shadow-md shadow-violet-500/30 scale-105"
                            : "hover:border-violet-500/40 hover:text-violet-500"
                        }`}
                        style={selectedSlot !== slot ? {
                          background: "var(--app-nav-hover-bg)",
                          border: "1px solid var(--app-border)",
                          color: "var(--app-text-secondary)"
                        } : {}}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedDate && (
            <p className="text-center text-sm py-2" style={{ color: "var(--app-text-muted)" }}>
              {Object.keys(availability).length === 0
                ? "This tutor hasn't set availability yet."
                : "Select a highlighted day to see available times."}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-2xl"
            style={{ borderColor: "var(--app-border)", color: "var(--app-text-secondary)", background: "transparent" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedSlot || booking}
            className="flex-1 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 disabled:opacity-40 hover:scale-105 transition-all"
          >
            {booking ? "Booking..." : (
              <><Check className="w-4 h-4 mr-1.5" /> Confirm Booking</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}