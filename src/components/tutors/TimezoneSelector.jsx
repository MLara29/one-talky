import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Common IANA timezones covering major regions tutors are likely in.
const COMMON_TIMEZONES = [
  "America/Sao_Paulo", "America/Manaus", "America/Fortaleza", "America/New_York",
  "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Mexico_City",
  "America/Bogota", "America/Argentina/Buenos_Aires", "America/Santiago",
  "Europe/London", "Europe/Lisbon", "Europe/Madrid", "Europe/Paris", "Europe/Berlin",
  "Europe/Rome", "Africa/Lagos", "Africa/Johannesburg", "Asia/Dubai", "Asia/Kolkata",
  "Asia/Shanghai", "Asia/Tokyo", "Asia/Singapore", "Australia/Sydney", "Pacific/Auckland",
];

export default function TimezoneSelector({ currentTz, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const options = COMMON_TIMEZONES.includes(currentTz)
    ? COMMON_TIMEZONES
    : [currentTz, ...COMMON_TIMEZONES];

  const changeTimezone = async (tz) => {
    if (tz === currentTz) return;
    setSaving(true);
    try {
      await base44.functions.invoke("updateMyProfile", { updates: { timezone: tz } });
      onSaved?.(tz);
      toast({
        title: "Timezone updated ✅",
        description: "Already scheduled lessons are not affected — this only changes how your future availability is interpreted.",
      });
    } catch (err) {
      toast({ title: "Error saving", description: err?.message || "Please try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Select value={currentTz} onValueChange={changeTimezone} disabled={saving}>
      <SelectTrigger className="w-auto min-w-[220px] h-8 text-xs bg-white border-gray-300 text-gray-900">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-white border-gray-200">
        {options.map(tz => (
          <SelectItem key={tz} value={tz} className="text-xs text-gray-900 focus:bg-violet-50 focus:text-violet-700">{tz}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}