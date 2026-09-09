import React, { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { base44 } from "@/api/base44Client";

const LOCALE_MAP = { en: "en-US", pt_br: "pt-BR", pt_pt: "pt-PT", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT", ja: "ja-JP", ko: "ko-KR" };
function getMonthName(lang, year, month) {
  return new Intl.DateTimeFormat(LOCALE_MAP[lang] || "en-US", { month: "long" }).format(new Date(year, month, 1));
}
function getDayLabels(lang) {
  const base = new Date(2024, 0, 7);
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
 * Convert a tutor-local date + slot to a UTC Date object.
 * tutorDateStr: "YYYY-MM-DD" in the tutor's timezone
 * slot: "HH:MM" string in the tutor's local time
 * tutorTz: IANA timezone string (e.g. "Africa/Johannesburg")
 */
function tutorDateSlotToUTC(tutorDateStr, slot, tutorTz) {
  const [h, m] = slot.split(":").map(Number);
  const [year, month1, day] = tutorDateStr.split("-").map(Number);
  const month = month1 - 1;

  if (!tutorTz) {
    return new Date(Date.UTC(year, month, day, h, m));
  }

  const isoString = `${tutorDateStr}T${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`;
  const utcGuess = new Date(isoString + "Z");

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

  const tzDateMs = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMin);
  const wantedMs = Date.UTC(year, month, day, h, m);
  const offsetMs = tzDateMs - wantedMs;

  return new Date(utcGuess.getTime() - offsetMs);
}

/**
 * Convert a JS Date (student's browser-local) to "YYYY-MM-DD" in the tutor's timezone.
 * Uses noon to avoid midnight timezone edge cases.
 */
function dateToTutorDateStr(date, tutorTz) {
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  if (!tutorTz) {
    return `${noon.getFullYear()}-${String(noon.getMonth()+1).padStart(2,"0")}-${String(noon.getDate()).padStart(2,"0")}`;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tutorTz,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(noon);
  const get = (type) => parts.find(p => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Returns [dayBefore, sameDay, dayAfter] as "YYYY-MM-DD" strings */
function getNeighborDates(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  const before = new Date(date); before.setDate(before.getDate() - 1);
  const after = new Date(date); after.setDate(after.getDate() + 1);
  const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
  return [fmt(before), dateStr, fmt(after)];
}

function utcToLocalTimeStr(utcDate) {
  return utcDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function ScheduleModal({ tutor, onClose, onConfirm, booking }) {
  const { lang } = useLang();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [dateAvailabilityMap, setDateAvailabilityMap] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  const tutorTz = tutor.timezone || null;
  const bookedSlots = tutor.booked_slots || [];
  const minNoticeMs = (tutor.min_booking_notice_hours || 0) * 60 * 60 * 1000;

  // Fetch per-date availability from TutorAvailabilityDate
  useEffect(() => {
    if (!tutor?.user_id) return;
    (async () => {
      try {
        const records = await base44.entities.TutorAvailabilityDate.filter({ tutor_id: tutor.user_id }, "date", 500);
        const map = {};
        records.forEach(r => {
          if (r.slots && r.slots.length > 0) map[r.date] = r.slots;
        });
        setDateAvailabilityMap(map);
      } catch (e) {
        console.error('[ScheduleModal] availability load error:', e);
      } finally {
        setLoadingAvailability(false);
      }
    })();
  }, [tutor?.user_id]);

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
   * Queries TutorAvailabilityDate for the tutor's date corresponding to the
   * clicked student date (plus neighbor dates to handle timezone offsets).
   * Booked-slot exclusion logic is unchanged from the original.
   */
  const getSlotsForDate = (date) => {
    if (!date) return [];
    const slots = [];

    // Determine the tutor's date for this student date, plus neighbors
    // to catch timezone edge cases (a tutor slot on their local date might
    // map to a different student date due to tz offset).
    const tutorDateStr = dateToTutorDateStr(date, tutorTz);
    const candidateDates = getNeighborDates(tutorDateStr);

    for (const tutorDate of candidateDates) {
      const daySlots = dateAvailabilityMap[tutorDate] || [];
      for (const slot of daySlots) {
        const utcDate = tutorDateSlotToUTC(tutorDate, slot, tutorTz);

        // Verify the student-local date matches the clicked calendar date
        const sameDay =
          utcDate.getFullYear() === date.getFullYear() &&
          utcDate.getMonth() === date.getMonth() &&
          utcDate.getDate() === date.getDate();
        if (!sameDay) continue;

        // Check not already booked
        if (bookedSet.has(utcKey(utcDate))) continue;

        // Check not in the past
        if (utcDate < new Date()) continue;

        // Check tutor's minimum booking notice
        if (minNoticeMs > 0 && utcDate.getTime() - Date.now() < minNoticeMs) continue;

        slots.push({
          tutorSlot: slot,
          utcDate,
          displayLabel: utcToLocalTimeStr(utcDate),
        });
      }
    }

    slots.sort((a, b) => a.utcDate - b.utcDate);
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
    const iso = `${utc.getUTCFullYear()}-${String(utc.getUTCMonth()+1).padStart(2,"0")}-${String(utc.getUTCDate()).padStart(2,"0")}T${String(utc.getUTCHours()).padStart(2,"0")}:${String(utc.getUTCMinutes()).padStart(2,"0")}:00Z`;
    onConfirm(iso);
  };

  const dayLabels = getDayLabels(lang);
  const calendarDays = buildCalendarDays(viewYear, viewMonth);
  const slots = selectedDate ? getSlotsForDate(selectedDate) : [];
  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();

  const studentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzDiffers = tutorTz && tutorTz !== studentTz;

  if (loadingAvailability) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

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
              {Object.keys(dateAvailabilityMap).length === 0
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