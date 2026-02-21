import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Appointment } from "@/hooks/useAppointments";
import type { Provider } from "@/hooks/useProviders";

export const HOUR_HEIGHT = 60; // px per hour
export const START_HOUR = 7;
export const END_HOUR = 22;
export const TOTAL_HOURS = END_HOUR - START_HOUR;

export const typeColors: Record<string, string> = {
  consultation: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  therapy: "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  follow_up: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  emergency: "bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
};

// Provider color palette - distinct, accessible colors for each provider
export const PROVIDER_COLORS = [
  { bg: "bg-sky-50 dark:bg-sky-950/40", border: "border-sky-400 dark:border-sky-700", text: "text-sky-800 dark:text-sky-200", dot: "bg-sky-500", light: "hsl(199 89% 96%)" },
  { bg: "bg-violet-50 dark:bg-violet-950/40", border: "border-violet-400 dark:border-violet-700", text: "text-violet-800 dark:text-violet-200", dot: "bg-violet-500", light: "hsl(270 80% 96%)" },
  { bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-400 dark:border-amber-700", text: "text-amber-800 dark:text-amber-200", dot: "bg-amber-500", light: "hsl(45 93% 95%)" },
  { bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-400 dark:border-rose-700", text: "text-rose-800 dark:text-rose-200", dot: "bg-rose-500", light: "hsl(350 80% 96%)" },
  { bg: "bg-teal-50 dark:bg-teal-950/40", border: "border-teal-400 dark:border-teal-700", text: "text-teal-800 dark:text-teal-200", dot: "bg-teal-500", light: "hsl(166 76% 95%)" },
  { bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-400 dark:border-indigo-700", text: "text-indigo-800 dark:text-indigo-200", dot: "bg-indigo-500", light: "hsl(226 83% 96%)" },
];

export function getProviderColor(providerId: string | null | undefined, allProviders: Provider[]) {
  if (!providerId) return PROVIDER_COLORS[0];
  const idx = allProviders.findIndex(p => p.user_id === providerId);
  return PROVIDER_COLORS[idx >= 0 ? idx % PROVIDER_COLORS.length : 0];
}

export const statusLabels: Record<string, string> = {
  scheduled: "นัดหมายแล้ว",
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  no_show: "ไม่มา",
};

export const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

export interface GoogleEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  status: string;
  provider_id?: string;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function getTopAndHeight(startTime: string, endTime: string | null) {
  const startMin = timeToMinutes(startTime.slice(0, 5));
  const endMin = endTime ? timeToMinutes(endTime.slice(0, 5)) : startMin + 30;
  const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);
  return { top, height };
}

// Snap to nearest 15 minutes
function snapToGrid(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

// Provider colors for columns (used in provider column mode headers)
const providerColumnColors = PROVIDER_COLORS.map(c => c.light);

interface WeekTimeSlotViewProps {
  displayDays: Date[];
  isLoading: boolean;
  getAppointmentsForDate: (date: Date) => Appointment[];
  getGoogleEventsForDate: (date: Date) => GoogleEvent[];
  onAppointmentClick: (apt: Appointment) => void;
  onAppointmentDrop?: (aptId: string, newDate: string, newStartTime: string, newEndTime: string | null) => void;
  isDayView?: boolean;
  // Provider column mode
  selectedProviders?: Provider[];
  providerColumnMode?: boolean;
  allProviders?: Provider[];
}

export default function WeekTimeSlotView({
  displayDays,
  isLoading,
  getAppointmentsForDate,
  getGoogleEventsForDate,
  onAppointmentClick,
  onAppointmentDrop,
  isDayView = false,
  selectedProviders = [],
  providerColumnMode = false,
  allProviders = [],
}: WeekTimeSlotViewProps) {
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
  const { toast } = useToast();

  const getProviderShortName = (providerId?: string) => {
    if (!providerId || allProviders.length === 0) return null;
    const p = allProviders.find(pr => pr.user_id === providerId);
    return p?.full_name || null;
  };

  // Drag state
  const [draggingApt, setDraggingApt] = useState<Appointment | null>(null);
  const [dragPreview, setDragPreview] = useState<{ dayIndex: number; top: number; height: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragStartY = useRef<number>(0);
  const dragStartTop = useRef<number>(0);
  const dragAptHeight = useRef<number>(0);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent, apt: Appointment, dayIdx: number) => {
    if (e.button !== 0 || !onAppointmentDrop) return;
    e.preventDefault();
    e.stopPropagation();

    const { top, height } = getTopAndHeight(apt.start_time, apt.end_time);
    dragStartY.current = e.clientY;
    dragStartTop.current = top;
    dragAptHeight.current = height;
    isDragging.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - dragStartY.current;
      if (!isDragging.current && Math.abs(deltaY) < 5) return;
      isDragging.current = true;

      if (!draggingApt) setDraggingApt(apt);

      let targetDayIndex = dayIdx;
      for (let i = 0; i < columnRefs.current.length; i++) {
        const col = columnRefs.current[i];
        if (col) {
          const rect = col.getBoundingClientRect();
          if (moveEvent.clientX >= rect.left && moveEvent.clientX < rect.right) {
            targetDayIndex = i;
            break;
          }
        }
      }

      const newTop = Math.max(0, Math.min(dragStartTop.current + deltaY, TOTAL_HOURS * HOUR_HEIGHT - dragAptHeight.current));
      setDragPreview({ dayIndex: targetDayIndex, top: newTop, height: dragAptHeight.current });
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (isDragging.current && dragPreview) {
        const preview = dragPreview;
        const newStartMinutes = snapToGrid(START_HOUR * 60 + (preview.top / HOUR_HEIGHT) * 60);
        const duration = apt.end_time
          ? timeToMinutes(apt.end_time.slice(0, 5)) - timeToMinutes(apt.start_time.slice(0, 5))
          : 30;
        const newEndMinutes = newStartMinutes + duration;

        // In provider column mode, dayIdx maps differently
        const effectiveDayIndex = providerColumnMode ? 0 : preview.dayIndex;
        const targetDay = displayDays[Math.min(effectiveDayIndex, displayDays.length - 1)];
        const newDate = format(targetDay, "yyyy-MM-dd");
        const newStartTime = minutesToTime(newStartMinutes);
        const newEndTime = apt.end_time ? minutesToTime(newEndMinutes) : null;

        const oldDate = apt.appointment_date;
        const oldStart = apt.start_time.slice(0, 5);
        if (newDate !== oldDate || newStartTime !== oldStart) {
          onAppointmentDrop(apt.id, newDate, newStartTime, newEndTime);
          toast({
            title: "ย้ายนัดหมายแล้ว",
            description: `ย้ายไปเวลา ${newStartTime} น.`,
          });
        }
      }

      setDraggingApt(null);
      setDragPreview(null);
      isDragging.current = false;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [draggingApt, dragPreview, displayDays, onAppointmentDrop, toast, providerColumnMode]);

  const handleClick = useCallback((e: React.MouseEvent, apt: Appointment) => {
    if (!isDragging.current) {
      onAppointmentClick(apt);
    }
  }, [onAppointmentClick]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-soft overflow-hidden flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Provider column mode: show one day with providers as columns
  if (providerColumnMode && selectedProviders.length > 0) {
    const day = displayDays[0]; // Use the first day
    const allDayApts = getAppointmentsForDate(day);
    const googleEvts = getGoogleEventsForDate(day);
    const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

    return (
      <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <div style={{ minWidth: `${80 + selectedProviders.length * 180}px` }}>
            {/* Header row - sticky */}
            <div className="sticky top-0 z-20 bg-card border-b flex">
              <div className="w-16 shrink-0 border-r flex items-center justify-center">
                <span className="text-xs text-muted-foreground font-medium">
                  {format(day, "d MMM", { locale: th })}
                </span>
              </div>
              {selectedProviders.map((provider, i) => (
                <div
                  key={provider.user_id}
                  className="flex-1 text-center py-3 border-r last:border-r-0 min-w-[180px]"
                  style={{ backgroundColor: providerColumnColors[i % providerColumnColors.length] }}
                >
                  <p className="text-sm font-semibold truncate px-2">
                    {provider.full_name}
                  </p>
                  {provider.specialty && (
                    <p className="text-[10px] text-muted-foreground">{provider.specialty}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="flex relative" ref={gridRef}>
              {/* Time labels */}
              <div className="w-16 shrink-0 border-r">
                {hours.map((hour) => (
                  <div key={hour} className="border-b relative" style={{ height: HOUR_HEIGHT }}>
                    <span className="absolute -top-2.5 right-2 text-[10px] text-muted-foreground font-medium">
                      {hour.toString().padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* Provider columns */}
              {selectedProviders.map((provider, provIdx) => {
                const providerApts = allDayApts.filter(apt => apt.provider_id === provider.user_id);
                // Also show unassigned appointments in first column
                const unassignedApts = provIdx === 0
                  ? allDayApts.filter(apt => !apt.provider_id && !selectedProviders.some(p => p.user_id === apt.provider_id))
                  : [];
                const columnApts = [...providerApts, ...unassignedApts];

                return (
                  <div
                    key={provider.user_id}
                    ref={(el) => { columnRefs.current[provIdx] = el; }}
                    className={cn(
                      "flex-1 border-r last:border-r-0 relative min-w-[180px]",
                      isToday && "bg-primary/5"
                    )}
                    style={{ backgroundColor: `${providerColumnColors[provIdx % providerColumnColors.length]}40` }}
                  >
                    {/* Hour grid lines */}
                    {hours.map((hour) => (
                      <div key={hour} className="border-b" style={{ height: HOUR_HEIGHT }}>
                        <div className="border-b border-dashed border-border/40" style={{ height: HOUR_HEIGHT / 2 }} />
                      </div>
                    ))}

                    {/* Appointments overlay */}
                    <div className="absolute inset-0">
                      {columnApts.map((apt) => {
                        const { top, height } = getTopAndHeight(apt.start_time, apt.end_time);
                        const provColor = getProviderColor(apt.provider_id, allProviders);
                        const patientName = apt.patients
                          ? `${apt.patients.first_name} ${apt.patients.last_name}`
                          : "ไม่ทราบชื่อ";
                        if (top + height < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null;

                        const isBeingDragged = draggingApt?.id === apt.id;

                        return (
                          <div
                            key={apt.id}
                            onMouseDown={(e) => handleMouseDown(e, apt, provIdx)}
                            onClick={(e) => handleClick(e, apt)}
                            className={cn(
                              "absolute left-1 right-1 rounded-lg border-l-[3px] overflow-hidden transition-shadow px-2 py-1 select-none z-[2]",
                              onAppointmentDrop ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                              "hover:shadow-md hover:z-10",
                              provColor.bg, provColor.border, provColor.text,
                              isBeingDragged && "opacity-40"
                            )}
                            style={{ top, height: Math.max(height, 28) }}
                            title={`${apt.start_time.slice(0, 5)}${apt.end_time ? ` - ${apt.end_time.slice(0, 5)}` : ""} ${patientName}`}
                          >
                            <div className="flex items-center gap-1 truncate">
                              <span className="text-[11px] font-semibold whitespace-nowrap">
                                {apt.start_time.slice(0, 5)}
                              </span>
                              <span className="text-[11px] font-medium truncate">
                                {patientName}
                              </span>
                            </div>
                            {height >= 40 && (
                              <span className="text-[9px] opacity-70 truncate block">
                                HN: {apt.patients?.hn || "-"}
                              </span>
                            )}
                            {height >= 55 && (
                              <Badge variant="outline" className={cn("text-[8px] px-1 py-0 mt-0.5", statusColors[apt.status || "scheduled"])}>
                                {statusLabels[apt.status || "scheduled"]}
                              </Badge>
                            )}
                          </div>
                        );
                      })}

                      {/* Google Calendar blocked events - filtered by provider */}
                      {googleEvts.filter(ge => ge.provider_id === provider.user_id).map((gEvent) => {
                        const startTime = gEvent.start?.includes("T") ? gEvent.start.substring(11, 16) : "09:00";
                        const endTime = gEvent.end?.includes("T") ? gEvent.end.substring(11, 16) : null;
                        const { top, height } = getTopAndHeight(startTime, endTime);
                        if (top + height < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null;
                        const provName = getProviderShortName(gEvent.provider_id);

                        return (
                          <div
                            key={`g-${gEvent.id}`}
                            className="absolute left-1 right-1 rounded-lg border border-dashed border-red-300 dark:border-red-700 bg-red-50/80 dark:bg-red-950/40 px-1.5 py-0.5 overflow-hidden pointer-events-none z-[1]"
                            style={{ top, height: Math.max(height, 24), backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(239,68,68,0.07) 4px, rgba(239,68,68,0.07) 8px)" }}
                            title={`ไม่ว่าง (Google Calendar)${provName ? ` - ${provName}` : ""}`}
                          >
                            <div className="flex items-center gap-1">
                              <Ban className="w-3 h-3 text-red-400 dark:text-red-500 shrink-0" />
                              <span className="text-[10px] text-red-500 dark:text-red-400 font-medium truncate">
                                {startTime}{endTime ? ` - ${endTime}` : ""} ไม่ว่าง{provName ? ` (${provName})` : ""}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Drag preview ghost */}
                      {dragPreview && dragPreview.dayIndex === provIdx && draggingApt && (
                        <div
                          className="absolute left-1 right-1 rounded-md border-2 border-primary bg-primary/10 pointer-events-none z-20"
                          style={{ top: dragPreview.top, height: dragPreview.height }}
                        >
                          <div className="px-1.5 py-0.5">
                            <span className="text-[10px] font-semibold text-primary">
                              {minutesToTime(snapToGrid(START_HOUR * 60 + (dragPreview.top / HOUR_HEIGHT) * 60))} น.
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Current time indicator */}
                      {isToday && (() => {
                        const now = new Date();
                        const currentMin = now.getHours() * 60 + now.getMinutes();
                        const indicatorTop = ((currentMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                        if (indicatorTop < 0 || indicatorTop > TOTAL_HOURS * HOUR_HEIGHT) return null;
                        return (
                          <div
                            className="absolute left-0 right-0 pointer-events-none z-[15]"
                            style={{ top: indicatorTop }}
                          >
                            <div className="flex items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-destructive -ml-0.5 shrink-0 shadow-sm ring-2 ring-background" />
                              <div className="flex-1 h-[2px] bg-destructive shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard day/week view (original behavior)
  return (
    <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <div className={isDayView ? "min-w-[400px]" : "min-w-[800px]"}>
          {/* Header row - sticky */}
          <div className="sticky top-0 z-20 bg-card border-b flex">
            <div className="w-16 shrink-0 border-r" />
            {displayDays.map((day, i) => {
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 text-center py-3 border-r last:border-r-0",
                    isDayView ? "min-w-0" : "min-w-[100px]",
                    isToday && "bg-primary/5"
                  )}
                >
                  <p className="text-xs text-muted-foreground">
                    {format(day, "EEEE", { locale: th })}
                  </p>
                  <p className={cn(
                    "text-lg font-semibold mt-0.5",
                    isToday && "text-primary"
                  )}>
                    {format(day, "d")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(day, "MMMM yyyy", { locale: th })}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="flex relative" ref={gridRef}>
            {/* Time labels */}
            <div className="w-16 shrink-0 border-r relative">
              {hours.map((hour) => (
                <div key={hour} className="border-b relative" style={{ height: HOUR_HEIGHT }}>
                  <span className="absolute -top-2.5 right-2 text-[10px] text-muted-foreground font-medium">
                    {hour.toString().padStart(2, "0")}:00
                  </span>
                </div>
              ))}
              {/* Current time label */}
              {displayDays.some(d => format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")) && (() => {
                const now = new Date();
                const currentMin = now.getHours() * 60 + now.getMinutes();
                const indicatorTop = ((currentMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                if (indicatorTop < 0 || indicatorTop > TOTAL_HOURS * HOUR_HEIGHT) return null;
                return (
                  <span
                    className="absolute right-1 text-[10px] font-bold text-destructive z-10"
                    style={{ top: indicatorTop - 6 }}
                  >
                    {now.getHours().toString().padStart(2, "0")}:{now.getMinutes().toString().padStart(2, "0")}
                  </span>
                );
              })()}
            </div>

            {/* Day columns */}
            {displayDays.map((day, dayIndex) => {
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
              const dayApts = getAppointmentsForDate(day);
              const googleEvts = getGoogleEventsForDate(day);

              return (
                <div
                  key={dayIndex}
                  ref={(el) => { columnRefs.current[dayIndex] = el; }}
                  className={cn(
                    "flex-1 border-r last:border-r-0 relative",
                    isDayView ? "min-w-0" : "min-w-[100px]",
                    isToday && "bg-primary/5"
                  )}
                >
                  {/* Hour grid lines */}
                  {hours.map((hour) => (
                    <div key={hour} className="border-b" style={{ height: HOUR_HEIGHT }}>
                      <div className="border-b border-dashed border-border/40" style={{ height: HOUR_HEIGHT / 2 }} />
                    </div>
                  ))}

                  {/* Appointments overlay */}
                  <div className="absolute inset-0">
                    {dayApts.map((apt) => {
                      const { top, height } = getTopAndHeight(apt.start_time, apt.end_time);
                      const provColor = getProviderColor(apt.provider_id, allProviders);
                      const patientName = apt.patients
                        ? `${apt.patients.first_name} ${apt.patients.last_name}`
                        : "ไม่ทราบชื่อ";
                      if (top + height < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null;

                      const isBeingDragged = draggingApt?.id === apt.id;

                      return (
                        <div
                          key={apt.id}
                          onMouseDown={(e) => handleMouseDown(e, apt, dayIndex)}
                          onClick={(e) => handleClick(e, apt)}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded-lg border-l-[3px] overflow-hidden transition-shadow px-1.5 py-0.5 select-none z-[2]",
                            onAppointmentDrop ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                            "hover:shadow-md hover:z-10",
                            provColor.bg, provColor.border, provColor.text,
                            isBeingDragged && "opacity-40"
                          )}
                          style={{ top, height: Math.max(height, 24) }}
                          title={`${apt.start_time.slice(0, 5)}${apt.end_time ? ` - ${apt.end_time.slice(0, 5)}` : ""} ${patientName}`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <span className="text-[10px] font-semibold whitespace-nowrap">
                              {apt.start_time.slice(0, 5)}
                            </span>
                            <span className={cn("text-[10px] font-medium truncate", isDayView && "text-xs")}>
                              {patientName}
                            </span>
                          </div>
                          {height >= 40 && apt.provider_profile && (
                            <span className={cn("text-[9px] opacity-70 truncate block", isDayView && "text-[10px]")}>
                              {apt.provider_profile.full_name}
                            </span>
                          )}
                          {height >= 55 && (
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <Badge variant="outline" className={cn("text-[8px] px-1 py-0", statusColors[apt.status || "scheduled"])}>
                                {statusLabels[apt.status || "scheduled"]}
                              </Badge>
                              {isDayView && apt.chief_complaint && height >= 70 && (
                                <span className="text-[9px] opacity-60 truncate block mt-0.5">{apt.chief_complaint}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Google Calendar blocked events */}
                    {googleEvts.map((gEvent) => {
                      const startTime = gEvent.start?.includes("T") ? gEvent.start.substring(11, 16) : "09:00";
                      const endTime = gEvent.end?.includes("T") ? gEvent.end.substring(11, 16) : null;
                      const { top, height } = getTopAndHeight(startTime, endTime);
                      if (top + height < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null;
                      const provName = getProviderShortName(gEvent.provider_id);

                      return (
                        <div
                          key={`g-${gEvent.id}`}
                          className="absolute left-0.5 right-0.5 rounded-lg border border-dashed border-red-300 dark:border-red-700 bg-red-50/80 dark:bg-red-950/40 px-1.5 py-0.5 overflow-hidden pointer-events-none z-[1]"
                          style={{ top, height: Math.max(height, 24), backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(239,68,68,0.07) 4px, rgba(239,68,68,0.07) 8px)" }}
                          title={`ไม่ว่าง (Google Calendar)${provName ? ` - ${provName}` : ""}`}
                        >
                          <div className="flex items-center gap-1">
                            <Ban className="w-3 h-3 text-red-400 dark:text-red-500 shrink-0" />
                            <span className="text-[10px] text-red-500 dark:text-red-400 font-medium truncate">
                              {startTime}{endTime ? ` - ${endTime}` : ""} ไม่ว่าง{provName ? ` (${provName})` : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Drag preview ghost */}
                    {dragPreview && dragPreview.dayIndex === dayIndex && draggingApt && (
                      <div
                        className="absolute left-0.5 right-0.5 rounded-md border-2 border-primary bg-primary/10 pointer-events-none z-20"
                        style={{ top: dragPreview.top, height: dragPreview.height }}
                      >
                        <div className="px-1.5 py-0.5">
                          <span className="text-[10px] font-semibold text-primary">
                            {minutesToTime(snapToGrid(START_HOUR * 60 + (dragPreview.top / HOUR_HEIGHT) * 60))} น.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Current time indicator */}
                    {isToday && (() => {
                      const now = new Date();
                      const currentMin = now.getHours() * 60 + now.getMinutes();
                      const indicatorTop = ((currentMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                      if (indicatorTop < 0 || indicatorTop > TOTAL_HOURS * HOUR_HEIGHT) return null;
                      return (
                        <div
                          className="absolute left-0 right-0 pointer-events-none z-[15]"
                          style={{ top: indicatorTop }}
                        >
                          <div className="flex items-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-destructive -ml-0.5 shrink-0 shadow-sm ring-2 ring-background" />
                            <div className="flex-1 h-[2px] bg-destructive shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
