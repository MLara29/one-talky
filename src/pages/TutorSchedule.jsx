import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, Clock, Info, FileText, Copy, Snowflake, PlayCircle, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import TimezoneSelector from "@/components/tutors/TimezoneSelector";

// Per-date availability: each calendar day has its own independent set of
// slots, stored in TutorAvailabilityDate (tutor_id + date). The old weekly
// pattern (TutorProfile.availability) is no longer the source of truth —
// it's kept only as an optional template for quick filling.
const HOURS = [];
for (let h = 0; h < 24; h++) {
  HOURS.push(`${String(h).padStart(2, "0")}:00`);
  HOURS.push(`${String(h).padStart(2, "0")}:30`);
}

const NOTICE_OPTIONS = [
  { value: 0, label: "No minimum notice" },
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 6, label: "6 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
];

const WEEKDAY_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES_EN = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstWeekday(year, month) {
  return new Date(year, month, 1).getDay();
}

/** Format a JS Date as "YYYY-MM-DD" in the tutor's saved timezone (uses noon to avoid edge cases). */
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

/** Get the weekday name for a date in the tutor's timezone (for display). */
function getDayNameInTz(date, tz) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz || "UTC", weekday: "long" }).format(date);
}

// Convert the Brazil (Brasília, UTC-3) student activity window into the
// tutor's own timezone, so we can suggest when they're most likely to get
// bookings from Brazilian students.
function getBrazilWindowInTutorTz(tutorTz) {
  if (!tutorTz) return null;
  const fmt = (utcHour, utcMinute = 0) => {
    const d = new Date();
    d.setUTCHours(utcHour, utcMinute, 0, 0);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tutorTz, hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(d);
  };
  return {
    generalStart: fmt(9),
    generalEnd: fmt(2),
    peakStart: fmt(21),
    peakEnd: fmt(1),
  };
}

export default function TutorSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  // Timezone mismatch detection — compares browser tz with saved profile tz
  // every time the page loads. Never auto-updates; only warns and waits for
  // explicit confirmation from the tutor.
  const [tzMismatch, setTzMismatch] = useState(null); // detected tz string if different
  const [tzDismissed, setTzDismissed] = useState(false); // session-only dismiss
  const [updatingTz, setUpdatingTz] = useState(false);

  // Map of "YYYY-MM-DD" → ["HH:MM", ...] — per-date availability
  const [dateAvailability, setDateAvailability] = useState({});

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    if (!user?.id) return;
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        const p = profiles[0];
        if (!p.timezone) {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          await base44.functions.invoke('updateMyProfile', { updates: { timezone: tz } });
          p.timezone = tz;
        }
        setProfile(p);

        // Detect timezone mismatch — compare browser tz with saved profile tz
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (p.timezone && browserTz && p.timezone !== browserTz) {
          setTzMismatch(browserTz);
        }

        // Load per-date availability from TutorAvailabilityDate
        const records = await base44.entities.TutorAvailabilityDate.filter({ tutor_id: user.id }, "date", 500);
        const map = {};
        records.forEach(r => {
          map[r.date] = r.slots || [];
        });
        setDateAvailability(map);
      }
    } catch (e) {
      console.error('[TutorSchedule] load error:', e);
    } finally { setLoading(false); }
  };

  const tutorTz = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const toggleHour = (hour) => {
    if (!selectedDate) return;
    const dateStr = dateToTutorDateStr(selectedDate, tutorTz);
    setDateAvailability(prev => {
      const slots = prev[dateStr] || [];
      const updated = slots.includes(hour)
        ? slots.filter(h => h !== hour)
        : [...slots, hour].sort();
      return { ...prev, [dateStr]: updated };
    });
  };

  // How many slots configured for a given calendar date
  const getHoursForDate = (date) => {
    const dateStr = dateToTutorDateStr(date, tutorTz);
    return dateAvailability[dateStr] || [];
  };

  // Save ONLY the selected date's slots to TutorAvailabilityDate
  const saveSchedule = async () => {
    if (!profile || !selectedDate || !user?.id) return;
    setSaving(true);
    try {
      const dateStr = dateToTutorDateStr(selectedDate, tutorTz);
      const slots = dateAvailability[dateStr] || [];

      const existing = await base44.entities.TutorAvailabilityDate.filter({
        tutor_id: user.id,
        date: dateStr,
      });

      if (existing.length > 0) {
        await base44.entities.TutorAvailabilityDate.update(existing[0].id, { slots });
      } else {
        await base44.entities.TutorAvailabilityDate.create({
          tutor_id: user.id,
          date: dateStr,
          slots,
        });
      }

      toast({ title: "Schedule saved! ✅", description: `Availability for ${dateStr} has been updated.` });
    } catch (err) {
      toast({ title: "Error saving", description: err?.message || "Please try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  // Explicit action: copy the selected date's slots to the next 4 occurrences
  // of the same weekday. Each target date gets its own independent record.
  const copyToNext4Weekdays = async () => {
    if (!selectedDate || !user?.id) return;
    const dateStr = dateToTutorDateStr(selectedDate, tutorTz);
    const slots = dateAvailability[dateStr] || [];
    if (slots.length === 0) return;

    setCopying(true);
    try {
      const targets = [];
      for (let i = 1; i <= 4; i++) {
        const futureDate = new Date(selectedDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
        const futureDateStr = dateToTutorDateStr(futureDate, tutorTz);
        targets.push(futureDateStr);
      }

      for (const targetDateStr of targets) {
        const existing = await base44.entities.TutorAvailabilityDate.filter({
          tutor_id: user.id,
          date: targetDateStr,
        });
        if (existing.length > 0) {
          await base44.entities.TutorAvailabilityDate.update(existing[0].id, { slots: [...slots] });
        } else {
          await base44.entities.TutorAvailabilityDate.create({
            tutor_id: user.id,
            date: targetDateStr,
            slots: [...slots],
          });
        }
      }

      // Update local state
      setDateAvailability(prev => {
        const next = { ...prev };
        for (const targetDateStr of targets) {
          next[targetDateStr] = [...slots];
        }
        return next;
      });

      const weekdayName = getDayNameInTz(selectedDate, tutorTz);
      toast({ title: "Copied! ✅", description: `Slots copied to the next 4 ${weekdayName}s.` });
    } catch (err) {
      toast({ title: "Error copying", description: err?.message || "Please try again.", variant: "destructive" });
    } finally { setCopying(false); }
  };

  const toggleAvailableNow = async () => {
    if (!profile) return;
    await base44.functions.invoke('updateMyProfile', { updates: { is_available_now: !profile.is_available_now } });
    setProfile({ ...profile, is_available_now: !profile.is_available_now });
  };

  const [togglingFreeze, setTogglingFreeze] = useState(false);
  const toggleFreeze = async () => {
    if (!profile) return;
    setTogglingFreeze(true);
    try {
      const newFrozen = !profile.schedule_frozen;
      const updates = { schedule_frozen: newFrozen };
      if (newFrozen) updates.schedule_frozen_at = new Date().toISOString();
      await base44.functions.invoke('updateMyProfile', { updates });
      setProfile({ ...profile, ...updates });
      toast({
        title: newFrozen ? "Schedule frozen ❄️" : "Schedule reactivated ✅",
        description: newFrozen
          ? "You won't appear available for new bookings until you reactivate."
          : "Your availability is back exactly as it was.",
      });
    } catch (err) {
      toast({ title: "Error", description: err?.message || "Please try again.", variant: "destructive" });
    } finally { setTogglingFreeze(false); }
  };

  const [savingNotice, setSavingNotice] = useState(false);
  const changeMinNotice = async (value) => {
    if (!profile) return;
    setSavingNotice(true);
    try {
      await base44.functions.invoke('updateMyProfile', { updates: { min_booking_notice_hours: value } });
      setProfile({ ...profile, min_booking_notice_hours: value });
      toast({ title: "Booking notice updated! ✅" });
    } catch (err) {
      toast({ title: "Error saving", description: err?.message || "Please try again.", variant: "destructive" });
    } finally { setSavingNotice(false); }
  };

  // Update the tutor's timezone to match the browser-detected one, then reload
  // availability so the calendar reflects the new timezone.
  const updateTz = async () => {
    if (!tzMismatch || !profile) return;
    setUpdatingTz(true);
    try {
      await base44.functions.invoke('updateMyProfile', { updates: { timezone: tzMismatch } });
      const newTz = tzMismatch;
      setProfile(prev => ({ ...prev, timezone: newTz }));
      setTzMismatch(null);
      toast({ title: "Timezone updated! ✅", description: `Your timezone is now ${newTz}.` });
      // Reload availability with the updated timezone
      await loadProfile();
    } catch (err) {
      toast({ title: "Error updating timezone", description: err?.message || "Please try again.", variant: "destructive" });
    } finally { setUpdatingTz(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstWeekday = getFirstWeekday(viewYear, viewMonth);
  const todayStr = today.toDateString();

  const selectedDateStr = selectedDate ? dateToTutorDateStr(selectedDate, tutorTz) : null;
  const selectedSlots = selectedDateStr ? (dateAvailability[selectedDateStr] || []) : [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();

  // Total slots configured across all future dates
  const totalSlots = Object.values(dateAvailability).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white">My Schedule</h1>
          <p className="theme-subtext text-gray-500 text-sm mt-1">
            Set your availability per day — each date is independent
          </p>
        </div>
        <div className="theme-card flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
          <div className={`w-2.5 h-2.5 rounded-full ${profile?.is_available_now ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
          <Label className="theme-subtext text-sm font-medium text-gray-500">Available now</Label>
          <Switch checked={profile?.is_available_now} onCheckedChange={toggleAvailableNow} />
        </div>
      </div>

      {/* Timezone mismatch warning — non-blocking, session-dismissable */}
      {tzMismatch && !tzDismissed && (
        <div className="mb-5 px-4 py-4 rounded-2xl flex flex-col sm:flex-row sm:items-start gap-3"
          style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)" }}>
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="theme-heading font-semibold text-white text-sm">
              We detected a different timezone
            </p>
            <p className="theme-subtext text-xs text-gray-500 mt-1 leading-relaxed">
              Your profile timezone is <strong className="text-amber-300">{profile?.timezone}</strong>, but your device is now in <strong className="text-amber-300">{tzMismatch}</strong>.
              This may cause your schedule to appear at wrong times. Would you like to update?
            </p>
            <div className="flex gap-2 mt-3">
              <Button onClick={updateTz} disabled={updatingTz} size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                {updatingTz ? "Updating..." : "Update timezone"}
              </Button>
              <Button onClick={() => setTzDismissed(true)} variant="outline" size="sm">
                Ignore for now
              </Button>
            </div>
          </div>
        </div>
      )}

      <Link
        to="/tutor-agreement"
        target="_blank"
        className="flex items-center gap-2 text-sm font-medium text-orange-500 hover:underline mb-6 w-fit"
      >
        <FileText className="w-4 h-4" />
        View Tutor Service Agreement
      </Link>

      {/* Timezone info banner */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-start gap-3 px-4 py-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
        <div className="flex items-start gap-2 flex-1">
          <Info className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
          <p className="text-xs text-violet-300">
            Your slots are saved per individual date in your timezone. Each day has its own independent schedule — changing one date never affects others.
            {totalSlots > 0 && <span className="ml-2 text-violet-400">· {totalSlots} slot{totalSlots > 1 ? "s" : ""} configured</span>}
            <br />
            <span className="text-violet-400">Changing availability does not reschedule already-booked lessons — it only affects future bookings.</span>
          </p>
        </div>
        <TimezoneSelector
          currentTz={tutorTz}
          onSaved={(tz) => setProfile(prev => ({ ...prev, timezone: tz }))}
        />
      </div>

      {/* Minimum booking notice */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5 mb-5">
        <p className="theme-heading font-semibold text-white mb-1">Minimum booking notice</p>
        <p className="theme-subtext text-xs text-gray-500 mb-4">Students will only be able to book lessons with you respecting this minimum notice period.</p>
        <div className="flex flex-wrap gap-2">
          {NOTICE_OPTIONS.map(opt => {
            const active = (profile?.min_booking_notice_hours || 0) === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => changeMinNotice(opt.value)}
                disabled={savingNotice}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                  active
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brazil demand hint — converted to tutor's timezone */}
      {(() => {
        const w = getBrazilWindowInTutorTz(profile?.timezone);
        if (!w) return null;
        return (
          <div className="px-3 py-2.5 rounded-xl text-xs mb-4 flex items-start gap-2"
            style={{ background: "rgba(242,106,27,0.08)", border: "1px solid rgba(242,106,27,0.2)", color: "var(--app-text-secondary)" }}>
            <span>💡</span>
            <span>
              Most students are in Brazil. Based on your timezone, students are
              typically online from <strong>{w.generalStart}–{w.generalEnd}</strong>,
              with peak demand around <strong>{w.peakStart}–{w.peakEnd}</strong>.
              Setting availability in this window may get you more bookings.
            </span>
          </div>
        );
      })()}

      {/* Schedule frozen banner */}
      {profile?.schedule_frozen && (
        <div className="mb-5 px-4 py-4 rounded-2xl flex items-start gap-3"
          style={{ background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <Snowflake className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="theme-heading font-semibold text-white text-sm">
              Your schedule is frozen — you don't appear available for new bookings
            </p>
            <p className="theme-subtext text-xs text-gray-500 mt-1 leading-relaxed">
              Your configured slots are preserved exactly as they are. Already-scheduled lessons are not affected,
              and your <strong>"Available now"</strong> toggle for instant lessons keeps working independently.
              To start receiving new bookings again, click <strong>"Reactivate schedule"</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Freeze / Reactivate button */}
      <div className="mb-5">
        <button
          onClick={toggleFreeze}
          disabled={togglingFreeze}
          className={`w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 ${
            profile?.schedule_frozen
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
              : "bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25"
          }`}
        >
          {profile?.schedule_frozen ? (
            <>
              <PlayCircle className="w-5 h-5" />
              {togglingFreeze ? "Reactivating..." : "Reactivate schedule"}
            </>
          ) : (
            <>
              <Snowflake className="w-5 h-5" />
              {togglingFreeze ? "Freezing..." : "Freeze schedule"}
            </>
          )}
        </button>
        {!profile?.schedule_frozen && (
          <p className="theme-subtext text-xs text-gray-500 mt-2 text-center">
            Freezing hides all your future slots from students without deleting them. You can reactivate anytime.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} disabled={!canGoPrev}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white disabled:opacity-30">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="theme-heading font-semibold text-white text-lg">
              {MONTH_NAMES_EN[viewMonth]} {viewYear}
            </p>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAY_SHORT_EN.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const date = new Date(viewYear, viewMonth, day);
              const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const isToday = date.toDateString() === todayStr;
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const hours = getHoursForDate(date);
              const hasSlots = hours.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => !isPast && setSelectedDate(isSelected ? null : date)}
                  disabled={isPast}
                  className={`
                    relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all
                    ${isPast ? "opacity-25 cursor-not-allowed" : "cursor-pointer"}
                    ${isSelected
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30 scale-105"
                      : isToday
                        ? "bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30"
                        : hasSlots
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                          : "bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  <span>{day}</span>
                  {hasSlots && (
                   <span className="text-[9px] font-normal opacity-80">{hours.length}×</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
              Has slots
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-violet-600" />
              Selected
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
              No slots
            </div>
          </div>
        </div>

        {/* Hours panel */}
        <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5">
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Clock className="w-8 h-8 text-violet-400" />
              </div>
              <p className="theme-heading font-semibold text-white">Select a day</p>
              <p className="theme-subtext text-sm text-gray-500 max-w-[220px]">
                Click a day to set your available slots. Each day has its own independent schedule.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="theme-heading font-semibold text-white text-lg">
                  {selectedDate.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedDateStr} · {selectedSlots.length === 0 ? "No slots selected" : `${selectedSlots.length} 30-min slot${selectedSlots.length > 1 ? "s" : ""}`}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 max-h-[340px] overflow-y-auto pr-1">
                {HOURS.map(hour => {
                  const active = selectedSlots.includes(hour);
                  return (
                    <button
                      key={hour}
                      onClick={() => toggleHour(hour)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        active
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                          : "bg-white/5 border border-white/10 text-gray-400 hover:bg-violet-500/10 hover:border-violet-500/20 hover:text-violet-300"
                      }`}
                    >
                      {hour}
                    </button>
                  );
                })}
              </div>

              {selectedSlots.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-gray-500 mb-2">Selected slots (in your timezone):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSlots.map(h => (
                      <span key={h} className="text-xs bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-2 py-0.5 rounded-lg">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Copy to next 4 same-weekday — explicit, optional convenience */}
              {selectedSlots.length > 0 && (
                <button
                  onClick={copyToNext4Weekdays}
                  disabled={copying}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-gray-400 hover:bg-violet-500/10 hover:border-violet-500/20 hover:text-violet-300 transition-all disabled:opacity-50"
                >
                  <Copy className="w-4 h-4" />
                  {copying
                    ? "Copying..."
                    : `Copy to next 4 ${getDayNameInTz(selectedDate, tutorTz)}s`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          onClick={saveSchedule}
          disabled={saving || !selectedDate}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:scale-105 transition-all disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save this day's schedule"}
        </Button>
      </div>
    </div>
  );
}