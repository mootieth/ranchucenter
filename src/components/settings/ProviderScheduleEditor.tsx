import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, Clock, CalendarDays, Loader2 } from "lucide-react";
import {
  useProviderSchedules,
  useSaveProviderSchedules,
  getDayNameTh,
  type ProviderScheduleInput,
} from "@/hooks/useProviderSchedules";

interface ProviderScheduleEditorProps {
  providerId: string;
  providerName: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: { start_time: string; end_time: string }[];
}

const DEFAULT_SLOT = { start_time: "09:00", end_time: "17:00" };

const DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

const ProviderScheduleEditor = ({ providerId, providerName }: ProviderScheduleEditorProps) => {
  const { data: existingSchedules, isLoading } = useProviderSchedules(providerId);
  const saveSchedules = useSaveProviderSchedules();

  const [daySchedules, setDaySchedules] = useState<Record<number, DaySchedule>>({});

  useEffect(() => {
    if (!existingSchedules) return;

    const newState: Record<number, DaySchedule> = {};
    for (const day of DAYS) {
      const daySlots = existingSchedules.filter(s => s.day_of_week === day);
      newState[day] = {
        enabled: daySlots.length > 0,
        slots: daySlots.length > 0
          ? daySlots.map(s => ({ start_time: s.start_time.substring(0, 5), end_time: s.end_time.substring(0, 5) }))
          : [{ ...DEFAULT_SLOT }],
      };
    }
    setDaySchedules(newState);
  }, [existingSchedules]);

  const toggleDay = (day: number) => {
    setDaySchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day]?.enabled,
        slots: prev[day]?.slots?.length ? prev[day].slots : [{ ...DEFAULT_SLOT }],
      },
    }));
  };

  const addSlot = (day: number) => {
    setDaySchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...(prev[day]?.slots || []), { start_time: "13:00", end_time: "17:00" }],
      },
    }));
  };

  const removeSlot = (day: number, index: number) => {
    setDaySchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_, i) => i !== index),
      },
    }));
  };

  const updateSlot = (day: number, index: number, field: "start_time" | "end_time", value: string) => {
    setDaySchedules(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
      },
    }));
  };

  const handleSave = () => {
    const schedules: ProviderScheduleInput[] = [];
    for (const day of DAYS) {
      const ds = daySchedules[day];
      if (ds?.enabled && ds.slots.length > 0) {
        for (const slot of ds.slots) {
          if (slot.start_time && slot.end_time && slot.end_time > slot.start_time) {
            schedules.push({
              provider_id: providerId,
              day_of_week: day,
              start_time: slot.start_time,
              end_time: slot.end_time,
            });
          }
        }
      }
    }
    saveSchedules.mutate({ providerId, schedules });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          ตารางเวลาทำงาน — {providerName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {DAYS.map(day => {
          const ds = daySchedules[day] || { enabled: false, slots: [{ ...DEFAULT_SLOT }] };
          return (
            <div key={day} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`day-${day}`}
                  checked={ds.enabled}
                  onCheckedChange={() => toggleDay(day)}
                />
                <Label htmlFor={`day-${day}`} className="text-sm font-medium cursor-pointer min-w-[80px]">
                  {getDayNameTh(day)}
                </Label>
                {ds.enabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs ml-auto"
                    onClick={() => addSlot(day)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    เพิ่มช่วงเวลา
                  </Button>
                )}
              </div>
              {ds.enabled && (
                <div className="ml-8 space-y-2">
                  {ds.slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        type="time"
                        value={slot.start_time}
                        onChange={e => updateSlot(day, idx, "start_time", e.target.value)}
                        className="h-8 w-28 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">ถึง</span>
                      <Input
                        type="time"
                        value={slot.end_time}
                        onChange={e => updateSlot(day, idx, "end_time", e.target.value)}
                        className="h-8 w-28 text-sm"
                      />
                      {ds.slots.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeSlot(day, idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <Button onClick={handleSave} disabled={saveSchedules.isPending} className="w-full mt-4">
          {saveSchedules.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          บันทึกตารางเวลา
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProviderScheduleEditor;
