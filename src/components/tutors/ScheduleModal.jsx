import React, { useState } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getNext7Days() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function ScheduleModal({ tutor, onClose, onConfirm, booking }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const allDays = getNext7Days();
  const visibleDays = allDays.slice(weekOffset * 7, weekOffset * 7 + 7);

  // availability is an object like { Monday: ["09:00", "10:00", ...], ... }
  const availability = tutor.availability || {};

  const getSlotsForDate = (date) => {
    const dayName = DAYS[date.getDay()];
    return availability[dayName] || [];
  };

  const selectedSlots = selectedDate ? getSlotsForDate(selectedDate) : [];

  const handleConfirm = () => {
    if (!selectedDate || !selectedSlot) return;
    const [hours, minutes] = selectedSlot.split(":").map(Number);
    const scheduled = new Date(selectedDate);
    scheduled.setHours(hours, minutes, 0, 0);
    onConfirm(scheduled.toISOString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-400" />
            <h2 className="font-display font-bold text-white text-lg">Schedule a Lesson</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Week navigation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400 font-medium">Select a date</span>
              <div className="flex gap-1">
                <button
                  onClick={() => { setWeekOffset(0); setSelectedDate(null); setSelectedSlot(null); }}
                  disabled={weekOffset === 0}
                  className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setWeekOffset(1); setSelectedDate(null); setSelectedSlot(null); }}
                  disabled={weekOffset === 1}
                  className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {visibleDays.map((date, i) => {
                const slots = getSlotsForDate(date);
                const hasSlots = slots.length > 0;
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <button
                    key={i}
                    onClick={() => { if (hasSlots) { setSelectedDate(date); setSelectedSlot(null); } }}
                    disabled={!hasSlots}
                    className={`flex flex-col items-center py-2.5 px-1 rounded-xl text-center transition-all
                      ${isSelected ? "bg-violet-600 text-white" : ""}
                      ${!isSelected && hasSlots ? "hover:bg-white/10 text-white cursor-pointer" : ""}
                      ${!hasSlots ? "text-gray-700 cursor-not-allowed" : ""}
                    `}
                  >
                    <span className="text-[10px] font-medium mb-1">{DAY_SHORT[date.getDay()]}</span>
                    <span className={`text-sm font-bold ${isToday && !isSelected ? "text-violet-400" : ""}`}>
                      {date.getDate()}
                    </span>
                    {hasSlots && (
                      <span className={`w-1 h-1 rounded-full mt-1 ${isSelected ? "bg-white" : "bg-violet-400"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400 font-medium">
                  Available times on {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </span>
              </div>
              {selectedSlots.length === 0 ? (
                <p className="text-sm text-gray-600 text-center py-4">No slots available this day</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {selectedSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-3 rounded-xl text-sm font-medium transition-all
                        ${selectedSlot === slot
                          ? "bg-violet-600 text-white"
                          : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                        }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedDate && (
            <p className="text-center text-sm text-gray-600 py-2">
              {Object.keys(availability).length === 0
                ? "This tutor hasn't set availability yet."
                : "Select a highlighted date to see available times."}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-white/10 text-gray-300 hover:bg-white/10 bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDate || !selectedSlot || booking}
            className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 disabled:opacity-40"
          >
            {booking ? "Booking..." : "Confirm Booking"}
          </Button>
        </div>
      </div>
    </div>
  );
}