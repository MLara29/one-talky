import React, { useState, useMemo } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Mapeia nosso código de idioma pra um locale de verdade — usado só pra
// formatar nomes de mês/dia com o formatador nativo do navegador, em vez de
// manter listas fixas traduzidas à mão em 9 idiomas.
const LOCALE_MAP = { en: "en-US", pt_br: "pt-BR", pt_pt: "pt-PT", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT", ja: "ja-JP", ko: "ko-KR" };
function getMonthName(lang, year, month) {
  return new Intl.DateTimeFormat(LOCALE_MAP[lang] || "en-US", { month: "long" }).format(new Date(year, month, 1));
}
function getDayLabels(lang) {
  const base = new Date(2024, 0, 7); // um domingo, como referência
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base); d.setDate(base.getDate() + i);
    return new Intl.DateTimeFormat(LOCALE_MAP[lang] || "en-US", { weekday: "short" }).format(d);
  });
}

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

/**
 * Convert a tutor's local slot (day + "HH:MM" string) to a UTC Date object.
 * tutorTz: IANA timezone string (e.g. "Africa/Johannesburg")
 * date: JS Date representing the calendar day (in student's local time — we only use y/m/d)
 * slot: "HH:MM" string in tutor's local time
 */
function slotToUTC(date, slot, tutorTz) {
  const [h, m] = slot.split(":").map(Number);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  if (!tutorTz) {
    // Fallback: treat as UTC (old behaviour)
    return new Date(Date.UTC(year, month, day, h, m));
  }

  // Build a string "YYYY-MM-DD HH:MM" in the tutor's tz, then find UTC equivalent
  // We use Intl to detect what UTC offset the tutor's timezone has on that specific date+time
  const isoString = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`;

  // Parse as if it's in tutor's timezone using Intl trick
  // Create a date in UTC, then compute what time it would be in tutorTz, find the offset
  const utcGuess = new Date(isoString + "Z"); // treat as UTC first

  // Format the UTC guess back in tutorTz to find offset
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tutorTz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(utcGuess);
  const getPart = (type) => parseInt(parts.find(p => p.type === type)?.value || "0");
  const tzYear = getPart("year");
  const tzMonth = getPart("month") - 1;
  const tzDay = getPart("day");
  const tzHour = getPart("hour") % 24;
  const tzMin = getPart("minute");

  // Diff between what UTC reads in tutorTz vs what we wanted
  const tzDateMs = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMin);
  const wantedMs = Date.UTC(year, month, day, h, m);
  const offsetMs = tzDateMs - wantedMs; // positive = tz is ahead of UTC

  return new Date(utcGuess.getTime() - offsetMs);
}

/**
 * Format a UTC Date to student's local time string "HH:MM"
 */
function utcToLocalTimeStr(utcDate) {
  return utcDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function ScheduleModal({ tutor, onClose, onConfirm, booking }) {
  const { lang } = useLang();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null); // { tutorSlot: "HH:MM", utcDate: Date, displayLabel: "HH:MM" }

  const tutorTz = tutor.timezone || null;
  const availability = tutor.availability || {};
  const bookedSlots = tutor.booked_slots || [];
  const minNoticeMs = (tutor.min_booking_notice_hours || 0) * 60 * 60 * 1000;

  // Normalize booked ISO strings to UTC minute-precision keys
  const bookedSet = useMemo(() => new Set(
    bookedSlots.map(iso => {
      const d = new Date(iso);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}T${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
    })
  ), [bookedSlots]);

  const utcKey = (utcDate) => {
    return `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth()+1).padStart(2,"0")}-${String(utcDate.getUTCDate()).padStart(2,"0")}T${String(utcDate.getUTCHours()).padStart(2,"0")}:${String(utcDate.getUTCMinutes()).padStart(2,"0")}`;
  };

  /**
   * Get available slots for a calendar day (student's local date).
   * 
   * The tutor's availability is keyed by DAY NAME in the tutor's local timezone.
   * So for each slot on that calendar date, we must figure out what day it is
   * in the TUTOR's timezone to look up the right availability key.
   * 
   * Returns array of { tutorSlot, utcDate, displayLabel }
   */
  const getSlotsForDate = (date) => {
    if (!date) return [];
    const slots = [];

    // Check tutor's availability for the tutor-local day corresponding to each possible slot time
    // We iterate over all available tutor days/slots and find ones that map to this student calendar date
    for (const [dayName, daySlots] of Object.entries(availability)) {
      for (const slot of daySlots) {
        const utcDate = slotToUTC(date, slot, tutorTz);

        // Verify the student-local date still matches the calendar date clicked
        const studentLocalDate = new Date(utcDate);
        const sameDay =
          studentLocalDate.getFullYear() === date.getFullYear() &&
          studentLocalDate.getMonth() === date.getMonth() &&
          studentLocalDate.getDate() === date.getDate();
        if (!sameDay) continue;

        // Verify the tutor's day name matches what we have in availability
        if (tutorTz) {
          const tutorDayName = new Intl.DateTimeFormat("en-US", { timeZone: tutorTz, weekday: "long" }).format(utcDate);
          if (tutorDayName !== dayName) continue;
        } else {
          // No tz: use UTC day
          if (DAYS_OF_WEEK[utcDate.getUTCDay()] !== dayName) continue;
        }

        // Check not already booked
        if (bookedSet.has(utcKey(utcDate))) continue;

        // Check not in the past
        if (utcDate < new Date()) continue;

        // Check tutor's minimum booking notice
        if (minNoticeMs > 0 && utcDate.getTime() - Date.now() < minNoticeMs) continue;

        slots.push({
          tutorSlot: slot,
          utcDate,
          displayLabel: utcToLocalTimeStr(utcDate), // shown in student's local time
        });
      }
    }

    // Sort by time
    slots.sort((a, b) => a.utcDate - b.utcDate);
    // Remove duplicates by utcKey
    const seen = new Set();
    return slots.filter(s => {
      const k = utcKey(s.utcDate);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
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
    const utc = selectedSlot.utcDate;
    // Send UTC ISO at minute precision — matches backend normalize()
    const iso = `${utc.getUTCFullYear()}-${String(utc.getUTCMonth()+1).padStart(2,"0")}-${String(utc.getUTCDate()).padStart(2,"0")}T${String(utc.getUTCHours()).padStart(2,"0")}:${String(utc.getUTCMinutes()).padStart(2,"0")}:00Z`;
    onConfirm(iso);
  };

  const dayLabels = getDayLabels(lang);
  const calendarDays = buildCalendarDays(viewYear, viewMonth);
  const slots = selectedDate ? getSlotsForDate(selectedDate) : [];
  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();

  // Determine if tutor tz differs from student tz (to show a note)
  const studentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzDiffers = tutorTz && tutorTz !== studentTz;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="theme-card w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--app-border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <h2 className="theme-heading font-display font-bold text-lg">{t(lang, "scheduleModalTitle")}</h2>
          </div>
          <button onClick={onClose} className="theme-subtext w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Timezone note */}
          {tzDiffers && (
            <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(242,106,27,0.1)", border: "1px solid rgba(242,106,27,0.2)", color: "var(--app-text-secondary)" }}>
              {t(lang, "localTimezoneNote").replace("{tz}", studentTz.replace("_", " "))}
            </div>
          )}

          <div className="sm:flex sm:gap-6">
            {/* Calendar */}
            <div className="sm:w-[280px] shrink-0">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} disabled={!canGoPrev}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
                style={{ background: "var(--app-nav-hover-bg)" }}>
                <ChevronLeft className="w-4 h-4" style={{ color: "var(--app-text-secondary)" }} />
              </button>
              <h3 className="theme-heading font-display font-bold text-base">{getMonthName(lang, viewYear, viewMonth)} {viewYear}</h3>
              <button onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ background: "var(--app-nav-hover-bg)" }}>
                <ChevronRight className="w-4 h-4" style={{ color: "var(--app-text-secondary)" }} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {dayLabels.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide py-1"
                  style={{ color: "var(--app-text-muted)" }}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />;
                const available = isDateAvailable(date);
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                const isToday = date.toDateString() === today.toDateString();
                const isPast = (() => { const d = new Date(date); d.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); return d < t; })();

                return (
                  <button key={idx} onClick={() => handleDayClick(date)} disabled={!available}
                    className={`relative h-10 w-full flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all
                      ${isSelected ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105" : ""}
                      ${!isSelected && available ? "hover:bg-orange-500/15 cursor-pointer" : ""}
                      ${isPast || !available ? "opacity-30 cursor-not-allowed" : ""}
                    `}>
                    <span className={isToday && !isSelected ? "text-orange-500 font-bold" : isSelected ? "text-white" : ""}
                      style={{ color: isSelected ? undefined : (!available || isPast) ? "var(--app-text-muted)" : "var(--app-text-primary)" }}>
                      {date.getDate()}
                    </span>
                    {available && !isSelected && (
                      <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-orange-500" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] mt-3 flex items-center gap-1.5" style={{ color: "var(--app-text-muted)" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
              {t(lang, "daysWithSlotsNote")}
            </p>
            </div>

            {/* Time slots */}
            <div className="sm:flex-1 sm:border-l sm:pl-6 mt-5 sm:mt-0" style={{ borderColor: "var(--app-border)" }}>
          {selectedDate && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4" style={{ color: "var(--app-text-muted)" }} />
                <span className="theme-heading font-semibold text-sm">
                  {selectedDate.toLocaleDateString(LOCALE_MAP[lang] || "en-US", { weekday: "long", month: "long", day: "numeric" })}
                </span>
              </div>
              {slots.length === 0 ? (
                <p className="theme-subtext text-sm text-center py-3" style={{ color: "var(--app-text-muted)" }}>{t(lang, "noSlotsAvailable")}</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s, i) => (
                    <button key={i} onClick={() => setSelectedSlot(s)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        selectedSlot?.displayLabel === s.displayLabel && selectedSlot?.tutorSlot === s.tutorSlot
                          ? "bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-105"
                          : "hover:border-orange-500/40 hover:text-orange-500"
                      }`}
                      style={!(selectedSlot?.tutorSlot === s.tutorSlot) ? {
                        background: "var(--app-nav-hover-bg)",
                        border: "1px solid var(--app-border)",
                        color: "var(--app-text-secondary)"
                      } : {}}>
                      {s.displayLabel}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedDate && (
            <p className="text-center text-sm py-2" style={{ color: "var(--app-text-muted)" }}>
              {Object.keys(availability).length === 0
                ? t(lang, "tutorNoAvailability")
                : t(lang, "selectHighlightedDay")}
            </p>
          )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 shrink-0" style={{ borderTop: "1px solid var(--app-border)" }}>
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-2xl"
            style={{ borderColor: "var(--app-border)", color: "var(--app-text-secondary)", background: "transparent" }}>
            {t(lang, "cancelBtn")}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedDate || !selectedSlot || booking}
            className="flex-1 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/20 disabled:opacity-40 hover:scale-105 transition-all">
            {booking ? t(lang, "bookingBtn") : <><Check className="w-4 h-4 mr-1.5" /> {t(lang, "confirmBookingBtn")}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}