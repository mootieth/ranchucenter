import { useState } from "react";
import { format, isBefore, startOfDay, setMonth, setYear } from "date-fns";
import { th } from "date-fns/locale";
import { CalendarIcon, Clock, Check, AlertCircle, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BusySlot } from "@/components/ui/scroll-time-picker";
import type { ProviderSchedule } from "@/hooks/useProviderSchedules";
import { useDateBusySlots } from "@/hooks/useDateBusySlots";

interface DateTimeSlotPickerProps {
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  busySlots?: BusySlot[];
  startHour?: number;
  endHour?: number;
  interval?: number;
  providerSchedules?: ProviderSchedule[];
  providerId?: string | null;
  excludeAppointmentId?: string;
}

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

const DAY_NAMES_TH_SHORT = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const DateTimeSlotPicker = ({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  busySlots: externalBusySlots,
  startHour = 9,
  endHour = 20,
  interval = 30,
  providerSchedules = [],
  providerId,
  excludeAppointmentId,
}: DateTimeSlotPickerProps) => {
  const today = startOfDay(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    selectedDate ? new Date(selectedDate + "T00:00:00") : new Date()
  );

  // Fetch busy slots internally for the selected date + provider
  const { busySlots: fetchedBusySlots, isLoading: busySlotsLoading } = useDateBusySlots({
    providerId: providerId || null,
    date: selectedDate,
    providerSchedules,
    excludeAppointmentId,
    interval,
  });

  // Merge external and fetched busy slots (deduplicate by time)
  const mergedBusySlots = (() => {
    const all = [...fetchedBusySlots, ...(externalBusySlots || [])];
    const seen = new Set<string>();
    return all.filter(s => {
      if (seen.has(s.time)) return false;
      seen.add(s.time);
      return true;
    });
  })();

  const busySet = new Set(mergedBusySlots.map((s) => s.time));

  // Determine if the provider has any active schedule configured
  const hasProviderSchedule = providerId
    ? providerSchedules.some(s => s.provider_id === providerId && s.is_active)
    : false;

  // Get working days for the provider (set of day_of_week numbers)
  const workingDays = new Set(
    hasProviderSchedule
      ? providerSchedules
          .filter(s => s.provider_id === providerId && s.is_active)
          .map(s => s.day_of_week)
      : []
  );

  // Get schedules for a specific day of week
  const getSchedulesForDay = (dayOfWeek: number) => {
    if (!hasProviderSchedule) return [];
    return providerSchedules.filter(
      s => s.provider_id === providerId && s.day_of_week === dayOfWeek && s.is_active
    );
  };

  // Generate time slots based on provider schedule for selected date
  const generateTimeSlots = (): string[] => {
    if (!selectedDate) return [];

    const dateObj = new Date(selectedDate + "T00:00:00");
    const dayOfWeek = dateObj.getDay();
    const daySchedules = getSchedulesForDay(dayOfWeek);

    // If provider has schedule and works this day, only show slots within working hours
    if (hasProviderSchedule && daySchedules.length > 0) {
      const slots: string[] = [];
      for (const schedule of daySchedules) {
        const sStart = schedule.start_time.substring(0, 5);
        const sEnd = schedule.end_time.substring(0, 5);
        const [sh, sm] = sStart.split(":").map(Number);
        const [eh, em] = sEnd.split(":").map(Number);
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        for (let t = startMin; t < endMin; t += interval) {
          const hh = Math.floor(t / 60).toString().padStart(2, "0");
          const mm = (t % 60).toString().padStart(2, "0");
          slots.push(`${hh}:${mm}`);
        }
      }
      // Sort and deduplicate
      return [...new Set(slots)].sort();
    }

    // Default: all slots
    const slots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += interval) {
        slots.push(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
        );
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Get working hours text for selected date
  const getWorkingHoursText = (): string | null => {
    if (!selectedDate || !hasProviderSchedule) return null;
    const dateObj = new Date(selectedDate + "T00:00:00");
    const dayOfWeek = dateObj.getDay();
    const daySchedules = getSchedulesForDay(dayOfWeek);
    if (daySchedules.length === 0) return null;
    return daySchedules
      .map(s => `${s.start_time.substring(0, 5)}-${s.end_time.substring(0, 5)}`)
      .join(", ");
  };

  const disabledDays = (date: Date) => {
    if (isBefore(date, today)) return true;
    // If provider has schedule, disable days they don't work
    if (hasProviderSchedule) {
      return !workingDays.has(date.getDay());
    }
    // No schedule configured: default to blocking Sundays
    return date.getDay() === 0;
  };

  const dateObj = selectedDate
    ? new Date(selectedDate + "T00:00:00")
    : undefined;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear + i);

  const handleTodayClick = () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    onDateChange(todayStr);
    onTimeChange("");
    setCalendarMonth(new Date());
  };

  const workingHoursText = getWorkingHoursText();

  // Generate working day indicators for the calendar caption
  const workingDaysText = hasProviderSchedule
    ? [...workingDays].sort().map(d => DAY_NAMES_TH_SHORT[d]).join(" ")
    : null;

  return (
    <div className="space-y-4">
      {/* Labels Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-1.5 text-sm font-medium">
          <CalendarIcon className="w-4 h-4 text-primary" />
          เลือกวันที่ <span className="text-destructive">*</span>
        </label>
        <label className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          <Clock className="w-4 h-4 text-primary" />
          เลือกเวลา <span className="text-destructive">*</span>
        </label>
      </div>

      {/* Provider working days hint */}
      {hasProviderSchedule && workingDaysText && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>วันทำงาน: {workingDaysText}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Calendar Column */}
        <div className="border rounded-xl p-1 bg-card shadow-sm">
          {/* Month/Year selectors + Today button */}
          <div className="flex items-center gap-2 px-3 pt-2 pb-1">
            <Select
              value={calendarMonth.getMonth().toString()}
              onValueChange={(val) => {
                setCalendarMonth(setMonth(calendarMonth, parseInt(val)));
              }}
            >
              <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={calendarMonth.getFullYear().toString()}
              onValueChange={(val) => {
                setCalendarMonth(setYear(calendarMonth, parseInt(val)));
              }}
            >
              <SelectTrigger className="h-8 text-xs w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2 whitespace-nowrap"
              onClick={handleTodayClick}
            >
              วันนี้
            </Button>
          </div>
          <Calendar
            mode="single"
            selected={dateObj}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onSelect={(date) => {
              if (date) {
                onDateChange(format(date, "yyyy-MM-dd"));
                onTimeChange("");
              }
            }}
            disabled={disabledDays}
            className="p-3 pointer-events-auto"
          />
        </div>

        {/* Time Slots Column */}
        <div>
          <label className="flex md:hidden items-center gap-1.5 text-sm font-medium mb-2">
            <Clock className="w-4 h-4 text-primary" />
            เลือกเวลา <span className="text-destructive">*</span>
          </label>
          {selectedDate ? (
            <div className="border rounded-xl p-3 bg-card shadow-sm h-full">
              <p className="text-xs text-muted-foreground mb-1">
                {format(new Date(selectedDate + "T00:00:00"), "EEEE d MMMM yyyy", { locale: th })}
              </p>
              {workingHoursText && (
                <p className="text-xs text-primary/70 mb-3 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  เวลาทำงาน: {workingHoursText}
                </p>
              )}
              {busySlotsLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[200px]">
                  <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">กำลังโหลดตารางเวลา...</p>
                </div>
              ) : timeSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto overscroll-contain pr-1">
                  {timeSlots.map((slot) => {
                    const isBusy = busySet.has(slot);
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isBusy}
                        onClick={() => onTimeChange(slot)}
                        className={cn(
                          "relative flex items-center justify-center h-10 rounded-lg text-sm font-medium transition-all duration-150 border",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                            : isBusy
                              ? "bg-muted text-muted-foreground border-transparent cursor-not-allowed opacity-50 line-through"
                              : "bg-background text-foreground border-border hover:border-primary hover:bg-primary/5 hover:shadow-sm"
                        )}
                      >
                        {slot}
                        {isSelected && (
                          <Check className="absolute top-1 right-1 w-3 h-3" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center min-h-[200px]">
                  <AlertCircle className="w-8 h-8 text-destructive/40 mb-2" />
                  <p className="text-sm text-muted-foreground">ผู้รักษาไม่ได้ทำงานในวันนี้</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">กรุณาเลือกวันอื่น</p>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-xl p-8 bg-muted/30 flex flex-col items-center justify-center text-center min-h-[280px]">
              <CalendarIcon className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">กรุณาเลือกวันที่ก่อน</p>
              <p className="text-xs text-muted-foreground/60 mt-1">ระบบจะแสดงเวลาว่างให้อัตโนมัติ</p>
            </div>
          )}
        </div>
      </div>

      {/* Booking Summary */}
      {selectedDate && selectedTime && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Check className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">สรุปวัน-เวลานัดหมาย</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(selectedDate + "T00:00:00"), "EEEE d MMMM yyyy", { locale: th })} เวลา {selectedTime} น.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimeSlotPicker;
