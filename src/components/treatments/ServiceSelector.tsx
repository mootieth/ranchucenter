import { useState } from "react";
import { X, Clock, Check, ChevronsUpDown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useServices } from "@/hooks/useServices";

export interface ServiceItem {
  service_id: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  duration_minutes?: number | null;
}

interface ServiceSelectorProps {
  value: ServiceItem[];
  onChange: (items: ServiceItem[]) => void;
  label?: string;
  appointmentType?: string | null;
}

// Map appointment types to relevant service categories
const appointmentTypeCategoryMap: Record<string, string[]> = {
  consultation: ["ปรึกษา", "บำบัด"],
  assessment: ["ตรวจ"],
  follow_up: [],
  diagnosis: ["ตรวจ"],
};

const formatDuration = (minutes: number): string => {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`;
  }
  return `${minutes} นาที`;
};

const ServiceSelector = ({ value, onChange, label = "ค่าบริการ", appointmentType }: ServiceSelectorProps) => {
  const { data: services = [] } = useServices(false);
  const [open, setOpen] = useState(false);

  const handleSelectService = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    // Check if already added
    const existingIndex = value.findIndex((v) => v.service_id === serviceId);
    if (existingIndex >= 0) {
      // Increment quantity
      const updated = [...value];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1,
      };
      onChange(updated);
    } else {
      onChange([
        ...value,
        {
          service_id: serviceId,
          service_name: service.name,
          quantity: 1,
          unit_price: service.price,
          duration_minutes: service.duration_minutes,
        },
      ]);
    }
    setOpen(false);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...value];
    updated[index] = { ...updated[index], quantity: Math.max(1, qty) };
    onChange(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...value];
    updated[index] = { ...updated[index], unit_price: Math.max(0, price) };
    onChange(updated);
  };

  const totalDuration = value.reduce((sum, item) => {
    return sum + (item.duration_minutes || 0) * item.quantity;
  }, 0);

  const preferredCategories = appointmentType ? (appointmentTypeCategoryMap[appointmentType] || []) : [];

  // Sort services: preferred categories first, then rest
  const sortedServices = [...services].sort((a, b) => {
    const aMatch = preferredCategories.some(cat => a.category === cat);
    const bMatch = preferredCategories.some(cat => b.category === cat);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  const selectedIds = value.map((v) => v.service_id);
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">{label}</Label>

      {/* Searchable service dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn("w-full justify-between font-normal h-10 text-muted-foreground")}
          >
            เลือกบริการเพื่อเพิ่ม...
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onWheel={(e) => e.stopPropagation()}>
          <Command>
            <CommandInput placeholder="ค้นหาบริการ..." />
            <CommandList className="max-h-[300px] overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
              <CommandEmpty>ไม่พบบริการ</CommandEmpty>
              {preferredCategories.length > 0 && (() => {
                const matched = sortedServices.filter(s => preferredCategories.some(cat => s.category === cat));
                const rest = sortedServices.filter(s => !preferredCategories.some(cat => s.category === cat));
                return (
                  <>
                    {matched.length > 0 && (
                      <CommandGroup heading={
                        <span className="flex items-center gap-1 text-primary">
                          <Star className="w-3 h-3" />
                          บริการที่แนะนำ
                        </span>
                      }>
                        {matched.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={`${s.name} ${s.category || ""}`}
                            onSelect={() => handleSelectService(s.id)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedIds.includes(s.id) ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col flex-1">
                              <span>{s.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {s.price.toLocaleString()} บาท
                                {s.duration_minutes ? ` · ${formatDuration(s.duration_minutes)}` : ""}
                                {s.category ? ` · ${s.category}` : ""}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {rest.length > 0 && (
                      <CommandGroup heading="บริการอื่นๆ">
                        {rest.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={`${s.name} ${s.category || ""}`}
                            onSelect={() => handleSelectService(s.id)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedIds.includes(s.id) ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col flex-1">
                              <span>{s.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {s.price.toLocaleString()} บาท
                                {s.duration_minutes ? ` · ${formatDuration(s.duration_minutes)}` : ""}
                                {s.category ? ` · ${s.category}` : ""}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </>
                );
              })()}
              {preferredCategories.length === 0 && (
                <CommandGroup>
                  {sortedServices.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={`${s.name} ${s.category || ""}`}
                      onSelect={() => handleSelectService(s.id)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedIds.includes(s.id) ? "opacity-100" : "opacity-0")} />
                      <div className="flex flex-col flex-1">
                        <span>{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.price.toLocaleString()} บาท
                          {s.duration_minutes ? ` · ${formatDuration(s.duration_minutes)}` : ""}
                          {s.category ? ` · ${s.category}` : ""}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected services list */}
      {value.map((item, index) => (
        <div key={index} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.service_name}</p>
            {item.duration_minutes && item.duration_minutes > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(item.duration_minutes * item.quantity)}
              </p>
            )}
          </div>
          <div className="w-16">
            <Input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
              className="h-8 text-center text-sm"
            />
          </div>
          <div className="w-24">
            <Input
              type="number"
              min={0}
              value={item.unit_price}
              onChange={(e) => handlePriceChange(index, parseFloat(e.target.value) || 0)}
              className="h-8 text-right text-sm"
            />
          </div>
          <div className="w-20 text-right text-sm font-medium">
            {(item.quantity * item.unit_price).toLocaleString()} ฿
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => handleRemove(index)}
          >
            <X className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}

      {totalDuration > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/20 rounded-lg px-3 py-2">
          <Clock className="w-4 h-4" />
          <span>ระยะเวลารวม: <span className="font-semibold text-foreground">{formatDuration(totalDuration)}</span></span>
        </div>
      )}
    </div>
  );
};

export default ServiceSelector;
