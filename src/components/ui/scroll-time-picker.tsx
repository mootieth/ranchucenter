import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 3;
const HALF = Math.floor(VISIBLE_ITEMS / 2);

interface WheelColumnProps {
  items: string[];
  selected: number;
  onSelect: (index: number) => void;
  busyIndices?: Set<number>;
  busyReasons?: Map<number, string>;
}

const WheelColumn = ({ items, selected, onSelect, busyIndices, busyReasons }: WheelColumnProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isScrollingRef = React.useRef(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  const scrollToIndex = React.useCallback((index: number, smooth = true) => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: index * ITEM_HEIGHT,
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  React.useEffect(() => {
    scrollToIndex(selected, false);
  }, []);

  React.useEffect(() => {
    if (!isScrollingRef.current) {
      scrollToIndex(selected, false);
    }
  }, [selected, scrollToIndex]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    isScrollingRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      scrollToIndex(clampedIndex);
      onSelect(clampedIndex);
      isScrollingRef.current = false;
    }, 80);
  };

  return (
    <div className="relative" style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}>
      <div
        className="absolute left-0 right-0 pointer-events-none z-10 border-y border-primary/20 bg-primary/5 rounded-md"
        style={{ top: HALF * ITEM_HEIGHT, height: ITEM_HEIGHT }}
      />
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />

      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{
          scrollSnapType: "y mandatory",
          paddingTop: HALF * ITEM_HEIGHT,
          paddingBottom: HALF * ITEM_HEIGHT,
        }}
      >
        {items.map((item, i) => {
          const isBusy = busyIndices?.has(i);
          const reason = busyReasons?.get(i);
          const distance = Math.abs(i - selected);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25;
          const scale = distance === 0 ? 1 : distance === 1 ? 0.95 : 0.85;

          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-center cursor-pointer transition-all duration-150 snap-center select-none",
                isBusy && "relative"
              )}
              style={{
                height: ITEM_HEIGHT,
                opacity: isBusy ? opacity * 0.4 : opacity,
                transform: `scale(${scale})`,
                fontSize: distance === 0 ? "1.1rem" : "0.85rem",
                fontWeight: distance === 0 ? 600 : 400,
              }}
              onClick={() => {
                onSelect(i);
                scrollToIndex(i);
              }}
            >
              <span className={cn(isBusy && "line-through text-muted-foreground")}>{item}</span>
              {isBusy && distance === 0 && reason && (
                <span className="absolute -right-1 top-1/2 -translate-y-1/2 text-[9px] text-destructive bg-destructive/10 px-1 py-0.5 rounded-full whitespace-nowrap">
                  ไม่ว่าง
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface BusySlot {
  time: string; // "HH:mm"
  reason?: string;
}

interface ScrollTimePickerProps {
  value: string; // "HH:mm" format
  onChange: (value: string) => void;
  busySlots?: BusySlot[];
  minuteStep?: 5 | 10 | 15 | 30;
  className?: string;
}

const ScrollTimePicker = ({
  value,
  onChange,
  busySlots = [],
  minuteStep = 30,
  className,
}: ScrollTimePickerProps) => {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 / minuteStep }, (_, i) =>
    (i * minuteStep).toString().padStart(2, "0")
  );

  const [h, m] = value ? value.split(":").map(Number) : [9, 0];
  const selectedHour = isNaN(h) ? 9 : h;
  const selectedMinuteIndex = isNaN(m) ? 0 : Math.round(m / minuteStep);

  const busyHourMinuteSet = new Set(busySlots.map(s => s.time));
  const busyReasonsMap = new Map(busySlots.map(s => [s.time, s.reason || "ไม่ว่าง"]));

  const minuteBusyIndices = new Set<number>();
  const minuteBusyReasons = new Map<number, string>();
  minutes.forEach((min, idx) => {
    const timeKey = `${hours[selectedHour]}:${min}`;
    if (busyHourMinuteSet.has(timeKey)) {
      minuteBusyIndices.add(idx);
      minuteBusyReasons.set(idx, busyReasonsMap.get(timeKey) || "ไม่ว่าง");
    }
  });

  const hourBusyIndices = new Set<number>();
  const hourBusyReasons = new Map<number, string>();
  hours.forEach((hr, idx) => {
    const allBusy = minutes.every(min => busyHourMinuteSet.has(`${hr}:${min}`));
    if (allBusy && minutes.length > 0) {
      hourBusyIndices.add(idx);
      hourBusyReasons.set(idx, "ไม่ว่างทั้งชั่วโมง");
    }
  });

  // Find next available slot
  const findNextAvailable = (direction: "next" | "prev") => {
    const currentTotal = selectedHour * 60 + selectedMinuteIndex * minuteStep;
    const allSlots: string[] = [];
    for (const hr of hours) {
      for (const min of minutes) {
        allSlots.push(`${hr}:${min}`);
      }
    }

    if (direction === "next") {
      for (const slot of allSlots) {
        const [sh, sm] = slot.split(":").map(Number);
        if (sh * 60 + sm > currentTotal && !busyHourMinuteSet.has(slot)) {
          onChange(slot);
          return;
        }
      }
    } else {
      for (let i = allSlots.length - 1; i >= 0; i--) {
        const [sh, sm] = allSlots[i].split(":").map(Number);
        if (sh * 60 + sm < currentTotal && !busyHourMinuteSet.has(allSlots[i])) {
          onChange(allSlots[i]);
          return;
        }
      }
    }
  };

  const handleHourChange = (index: number) => {
    const newTime = `${hours[index]}:${minutes[selectedMinuteIndex] || "00"}`;
    onChange(newTime);
  };

  const handleMinuteChange = (index: number) => {
    const newTime = `${hours[selectedHour]}:${minutes[index]}`;
    onChange(newTime);
  };

  const currentTimeStr = `${hours[selectedHour]}:${minutes[selectedMinuteIndex] || "00"}`;
  const isCurrentBusy = busyHourMinuteSet.has(currentTimeStr);

  return (
    <div className={cn("bg-background rounded-xl border", className)}>
      {/* Search bar for available slots */}
      {busySlots.length > 0 && (
        <div className="flex items-center gap-1 px-2 pt-2 pb-1">
          <button
            type="button"
            onClick={() => findNextAvailable("prev")}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronUp className="w-3 h-3" />
            ก่อนหน้า
          </button>
          <div className="flex-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Search className="w-3 h-3" />
            <span>หาเวลาว่าง</span>
          </div>
          <button
            type="button"
            onClick={() => findNextAvailable("next")}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-muted transition-colors text-muted-foreground"
          >
            ถัดไป
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-0 p-2 pt-1">
        <div className="flex-1">
          <WheelColumn
            items={hours}
            selected={selectedHour}
            onSelect={handleHourChange}
            busyIndices={hourBusyIndices}
            busyReasons={hourBusyReasons}
          />
        </div>
        <div className="text-lg font-bold text-muted-foreground select-none px-1">:</div>
        <div className="flex-1">
          <WheelColumn
            items={minutes}
            selected={selectedMinuteIndex}
            onSelect={handleMinuteChange}
            busyIndices={minuteBusyIndices}
            busyReasons={minuteBusyReasons}
          />
        </div>
        <div className="flex-shrink-0 pl-2 text-sm text-muted-foreground font-medium select-none">น.</div>
      </div>

      {/* Status indicator */}
      {isCurrentBusy && (
        <div className="px-3 pb-2 text-center">
          <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
            ⚠ เวลานี้ไม่ว่าง — {busyReasonsMap.get(currentTimeStr)}
          </span>
        </div>
      )}
    </div>
  );
};

ScrollTimePicker.displayName = "ScrollTimePicker";

export { ScrollTimePicker };
