import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface DateInputProps {
  /** Value as "yyyy-MM-dd" string or empty string */
  value: string;
  /** Called with "yyyy-MM-dd" string or empty string */
  onChange: (value: string) => void;
  /** Max date in "yyyy-MM-dd" format */
  max?: string;
  /** Min date in "yyyy-MM-dd" format */
  min?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Date input component that displays DD/MM/YYYY format.
 * Uses native browser date picker for calendar selection.
 * Supports manual typing with auto-slash insertion.
 */
const DateInput = React.forwardRef<HTMLDivElement, DateInputProps>(
  ({ value, onChange, max, min, className, placeholder = "DD/MM/YYYY", disabled }, ref) => {
    const [textValue, setTextValue] = React.useState("");
    const nativeDateRef = React.useRef<HTMLInputElement>(null);

    // Sync textValue from external value
    React.useEffect(() => {
      if (value) {
        const date = new Date(value + "T00:00:00");
        if (isValid(date)) {
          setTextValue(format(date, "dd/MM/yyyy"));
        }
      } else {
        setTextValue("");
      }
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replace(/[^0-9/]/g, "");
      
      // Auto-insert slashes
      const digits = raw.replace(/\//g, "");
      if (digits.length >= 5) {
        raw = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
      } else if (digits.length >= 3) {
        raw = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      } else {
        raw = digits;
      }

      setTextValue(raw);

      // Try parse complete date
      if (raw.length === 10) {
        const parsed = parse(raw, "dd/MM/yyyy", new Date());
        if (isValid(parsed)) {
          const formatted = format(parsed, "yyyy-MM-dd");
          // Check bounds
          if (max && formatted > max) return;
          if (min && formatted < min) return;
          onChange(formatted);
        }
      }

      if (!raw) {
        onChange("");
      }
    };

    const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value; // yyyy-MM-dd
      if (val) {
        if (max && val > max) return;
        if (min && val < min) return;
        onChange(val);
      } else {
        onChange("");
      }
    };

    const openNativePicker = () => {
      if (nativeDateRef.current && !disabled) {
        nativeDateRef.current.showPicker?.();
      }
    };

    return (
      <div ref={ref} className={cn("relative", className)}>
        <Input
          placeholder={placeholder}
          value={textValue}
          onChange={handleTextChange}
          maxLength={10}
          disabled={disabled}
          className="input-focus pr-10"
        />
        {/* Native date input positioned over the calendar icon area */}
        <input
          ref={nativeDateRef}
          type="date"
          value={value || ""}
          onChange={handleNativeDateChange}
          max={max}
          min={min}
          disabled={disabled}
          className="absolute right-0 top-0 h-full w-10 opacity-0 cursor-pointer"
          tabIndex={-1}
        />
        {/* Calendar icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      </div>
    );
  }
);

DateInput.displayName = "DateInput";

export { DateInput };
