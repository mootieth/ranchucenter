import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Activity, Scale, Ruler } from "lucide-react";

export interface VitalSignsData {
  pulse?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  weight?: number | null;
  height?: number | null;
  temperature?: number | null;
  respiratory_rate?: number | null;
  oxygen_saturation?: number | null;
}

interface VitalSignsFormProps {
  value: VitalSignsData;
  onChange: (data: VitalSignsData) => void;
}

const VitalSignsForm = ({ value, onChange }: VitalSignsFormProps) => {
  const handleChange = (field: keyof VitalSignsData, inputValue: string) => {
    const numValue = inputValue === "" ? null : parseFloat(inputValue);
    onChange({ ...value, [field]: numValue });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Vital Signs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1: BP and Pulse */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Heart className="w-3 h-3" />
              ความดันโลหิต (S)
            </Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="120"
                value={value.systolic ?? ""}
                onChange={(e) => handleChange("systolic", e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">mmHg</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ความดันโลหิต (D)</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="80"
                value={value.diastolic ?? ""}
                onChange={(e) => handleChange("diastolic", e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">mmHg</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ชีพจร</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="72"
                value={value.pulse ?? ""}
                onChange={(e) => handleChange("pulse", e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">bpm</span>
            </div>
          </div>
        </div>

        {/* Row 2: Weight and Height */}
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Scale className="w-3 h-3" />
              น้ำหนัก
            </Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.1"
                placeholder="60"
                value={value.weight ?? ""}
                onChange={(e) => handleChange("weight", e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground">kg</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Ruler className="w-3 h-3" />
              ส่วนสูง
            </Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.1"
                placeholder="165"
                value={value.height ?? ""}
                onChange={(e) => handleChange("height", e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground">cm</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">อุณหภูมิ</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                step="0.1"
                placeholder="36.5"
                value={value.temperature ?? ""}
                onChange={(e) => handleChange("temperature", e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground">°C</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">SpO2</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="98"
                value={value.oxygen_saturation ?? ""}
                onChange={(e) => handleChange("oxygen_saturation", e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VitalSignsForm;
