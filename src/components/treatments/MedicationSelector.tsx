import { useState } from "react";
import { Plus, Trash2, Pill, Search, Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMedications } from "@/hooks/useMedications";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface MedicationItem {
  medication_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

export interface AllergyInfo {
  allergen: string;
  severity: string | null;
  reaction: string | null;
}

interface MedicationSelectorProps {
  value: MedicationItem[];
  onChange: (items: MedicationItem[]) => void;
  patientAllergies?: AllergyInfo[];
}

const frequencyOptions = [
  "วันละ 1 ครั้ง",
  "วันละ 2 ครั้ง",
  "วันละ 3 ครั้ง",
  "วันละ 4 ครั้ง",
  "ทุก 4 ชั่วโมง",
  "ทุก 6 ชั่วโมง",
  "ทุก 8 ชั่วโมง",
  "ทุก 12 ชั่วโมง",
  "เมื่อจำเป็น (PRN)",
  "ก่อนนอน",
  "หลังอาหาร",
  "ก่อนอาหาร",
];

const durationOptions = [
  "3 วัน",
  "5 วัน",
  "7 วัน",
  "10 วัน",
  "14 วัน",
  "21 วัน",
  "30 วัน",
  "60 วัน",
  "90 วัน",
  "ต่อเนื่อง",
];

const instructionOptions = [
  "ทานก่อนอาหาร",
  "ทานหลังอาหาร",
  "ทานพร้อมอาหาร",
  "ทานก่อนนอน",
  "ทานเมื่อจำเป็น",
  "ห้ามเคี้ยว",
  "ละลายใต้ลิ้น",
  "ดื่มน้ำตาม",
];

const severityLabels: Record<string, string> = {
  mild: "น้อย",
  moderate: "ปานกลาง",
  severe: "รุนแรง",
};

const MedicationSelector = ({ value, onChange, patientAllergies = [] }: MedicationSelectorProps) => {
  const { data: medications = [] } = useMedications();
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);
  const [allergyWarning, setAllergyWarning] = useState<{
    index: number;
    medicationId: string;
    medicationName: string;
    matchedAllergy: AllergyInfo;
  } | null>(null);

  // Check if a medication name matches any patient allergy
  const checkAllergyMatch = (medName: string, genericName: string | null): AllergyInfo | undefined => {
    if (patientAllergies.length === 0) return undefined;
    const lowerMedName = medName.toLowerCase();
    const lowerGeneric = (genericName || "").toLowerCase();

    return patientAllergies.find((allergy) => {
      const allergen = allergy.allergen.toLowerCase();
      return (
        lowerMedName.includes(allergen) ||
        allergen.includes(lowerMedName) ||
        (lowerGeneric && (lowerGeneric.includes(allergen) || allergen.includes(lowerGeneric)))
      );
    });
  };

  // Get allergy match for a given medication item (for inline warning display)
  const getAllergyForItem = (item: MedicationItem): AllergyInfo | undefined => {
    if (!item.medication_id || patientAllergies.length === 0) return undefined;
    const med = medications.find((m) => m.id === item.medication_id);
    if (!med) return undefined;
    return checkAllergyMatch(med.name, med.generic_name);
  };

  const addMedication = () => {
    onChange([
      ...value,
      {
        medication_id: "",
        medication_name: "",
        dosage: "",
        frequency: "วันละ 1 ครั้ง",
        duration: "7 วัน",
        quantity: 1,
        instructions: "",
      },
    ]);
  };

  const removeMedication = (index: number) => {
    const newItems = value.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const updateMedication = (index: number, field: keyof MedicationItem, fieldValue: string | number) => {
    const newItems = [...value];
    newItems[index] = { ...newItems[index], [field]: fieldValue };
    onChange(newItems);
  };

  const applyMedicationSelect = (index: number, medicationId: string) => {
    const selectedMed = medications.find((m) => m.id === medicationId);
    if (selectedMed) {
      const newItems = [...value];
      newItems[index] = {
        ...newItems[index],
        medication_id: medicationId,
        medication_name: `${selectedMed.name} ${selectedMed.strength || ""}`.trim(),
        dosage: selectedMed.strength || "",
      };
      onChange(newItems);
      setOpenPopoverIndex(null);
    }
  };

  const handleMedicationSelect = (index: number, medicationId: string) => {
    const selectedMed = medications.find((m) => m.id === medicationId);
    if (!selectedMed) return;

    // Check allergy
    const matchedAllergy = checkAllergyMatch(selectedMed.name, selectedMed.generic_name);
    if (matchedAllergy) {
      // Show allergy warning dialog
      setAllergyWarning({
        index,
        medicationId,
        medicationName: `${selectedMed.name} ${selectedMed.strength || ""}`.trim(),
        matchedAllergy,
      });
      setOpenPopoverIndex(null);
      return;
    }

    applyMedicationSelect(index, medicationId);
  };

  const handleAllergyConfirm = () => {
    if (allergyWarning) {
      applyMedicationSelect(allergyWarning.index, allergyWarning.medicationId);
      toast.warning(
        `⚠️ แจ้งเตือน: ผู้ป่วยแพ้ "${allergyWarning.matchedAllergy.allergen}" - ยา "${allergyWarning.medicationName}" ถูกเพิ่มตามคำสั่งแพทย์`,
        { duration: 8000 }
      );
    }
    setAllergyWarning(null);
  };

  const handleAllergyCancel = () => {
    setAllergyWarning(null);
  };

  return (
    <>
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="w-4 h-4 text-primary" />
            รายการยา
            {value.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {value.length} รายการ
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {value.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Pill className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">ยังไม่มีรายการยา</p>
              <p className="text-xs">คลิก "เพิ่มยา" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="space-y-4">
              {value.map((item, index) => {
                const itemAllergy = getAllergyForItem(item);
                return (
                  <div
                    key={index}
                    className={cn(
                      "p-4 border rounded-lg bg-muted/20 space-y-3 relative",
                      itemAllergy && "border-destructive/50 bg-destructive/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeMedication(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Allergy warning banner */}
                    {itemAllergy && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          <strong>แพ้ยา!</strong> ผู้ป่วยแพ้ "{itemAllergy.allergen}"
                          {itemAllergy.severity && ` (ระดับ: ${severityLabels[itemAllergy.severity] || itemAllergy.severity})`}
                          {itemAllergy.reaction && ` - อาการ: ${itemAllergy.reaction}`}
                        </span>
                      </div>
                    )}

                    <div className="grid gap-3">
                      {/* Medication Selection - Combobox with Popover + Command */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">ยา *</Label>
                        <Popover
                          open={openPopoverIndex === index}
                          onOpenChange={(open) => setOpenPopoverIndex(open ? index : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openPopoverIndex === index}
                              className={cn(
                                "w-full justify-between h-9 font-normal",
                                itemAllergy && "border-destructive/50 text-destructive"
                              )}
                              type="button"
                            >
                              {item.medication_id
                                ? item.medication_name
                                : "เลือกยา..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[9999]" align="start">
                            <Command>
                              <CommandInput placeholder="ค้นหายา..." />
                              <CommandList className="max-h-[250px]">
                                <CommandEmpty>ไม่พบยาที่ค้นหา</CommandEmpty>
                                <CommandGroup>
                                  {medications.map((med) => {
                                    const medAllergy = checkAllergyMatch(med.name, med.generic_name);
                                    return (
                                      <CommandItem
                                        key={med.id}
                                        value={`${med.name} ${med.strength || ""} ${med.generic_name || ""}`}
                                        onSelect={() => handleMedicationSelect(index, med.id)}
                                        className={cn(medAllergy && "text-destructive")}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            item.medication_id === med.id
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col flex-1">
                                          <span className="flex items-center gap-1">
                                            {med.name} {med.strength}
                                            {medAllergy && (
                                              <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                                            )}
                                          </span>
                                          {med.generic_name && (
                                            <span className="text-xs text-muted-foreground">
                                              {med.generic_name}
                                            </span>
                                          )}
                                          {medAllergy && (
                                            <span className="text-xs text-destructive font-medium">
                                              ⚠ แพ้ยา: {medAllergy.allergen}
                                            </span>
                                          )}
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Dosage */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">ขนาด</Label>
                          <Input
                            placeholder="เช่น 1 เม็ด"
                            value={item.dosage}
                            onChange={(e) =>
                              updateMedication(index, "dosage", e.target.value)
                            }
                            className="h-9"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">จำนวน</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateMedication(index, "quantity", parseInt(e.target.value) || 1)
                            }
                            className="h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Frequency */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">ความถี่</Label>
                          <Select
                            value={item.frequency}
                            onValueChange={(val) =>
                              updateMedication(index, "frequency", val)
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="เลือกความถี่" />
                            </SelectTrigger>
                            <SelectContent>
                              {frequencyOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Duration */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">ระยะเวลา</Label>
                          <Select
                            value={item.duration}
                            onValueChange={(val) =>
                              updateMedication(index, "duration", val)
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="เลือกระยะเวลา" />
                            </SelectTrigger>
                            <SelectContent>
                              {durationOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">คำแนะนำ</Label>
                        <Select
                          value={item.instructions}
                          onValueChange={(val) =>
                            updateMedication(index, "instructions", val)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="เลือกคำแนะนำ" />
                          </SelectTrigger>
                          <SelectContent>
                            {instructionOptions.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={addMedication}
          >
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มยา
          </Button>
        </CardContent>
      </Card>

      {/* Allergy Warning Dialog */}
      <AlertDialog open={!!allergyWarning} onOpenChange={(open) => !open && setAllergyWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              ⚠️ แจ้งเตือนการแพ้ยา!
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm space-y-1">
                  <p>
                    <strong>ยาที่เลือก:</strong> {allergyWarning?.medicationName}
                  </p>
                  <p>
                    <strong>สารที่แพ้:</strong> {allergyWarning?.matchedAllergy.allergen}
                  </p>
                  {allergyWarning?.matchedAllergy.severity && (
                    <p>
                      <strong>ระดับความรุนแรง:</strong>{" "}
                      {severityLabels[allergyWarning.matchedAllergy.severity] || allergyWarning.matchedAllergy.severity}
                    </p>
                  )}
                  {allergyWarning?.matchedAllergy.reaction && (
                    <p>
                      <strong>อาการที่เคยเกิด:</strong> {allergyWarning.matchedAllergy.reaction}
                    </p>
                  )}
                </div>
                <p className="text-foreground font-medium">
                  ผู้ป่วยมีประวัติแพ้ยานี้ คุณต้องการเพิ่มยานี้ต่อหรือไม่?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleAllergyCancel}>
              ยกเลิก - ไม่เพิ่มยานี้
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAllergyConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              ยืนยัน - เพิ่มยาตามคำสั่งแพทย์
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MedicationSelector;