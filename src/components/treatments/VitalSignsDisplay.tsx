import { Badge } from "@/components/ui/badge";
import { Heart, Activity, Scale, Ruler, Thermometer, Wind } from "lucide-react";
import type { VitalSignsData } from "./VitalSignsForm";

interface VitalSignsDisplayProps {
  data: VitalSignsData | null;
}

const VitalSignsDisplay = ({ data }: VitalSignsDisplayProps) => {
  if (!data) return null;

  const hasData = 
    data.pulse || 
    data.systolic || 
    data.diastolic || 
    data.weight || 
    data.height || 
    data.temperature || 
    data.oxygen_saturation;

  if (!hasData) return null;

  // Calculate BMI if weight and height are available
  const bmi = data.weight && data.height 
    ? (data.weight / Math.pow(data.height / 100, 2)).toFixed(1)
    : null;

  const getBmiCategory = (bmiValue: number) => {
    if (bmiValue < 18.5) return { label: "น้ำหนักต่ำ", color: "bg-warning/10 text-warning border-warning/20" };
    if (bmiValue < 23) return { label: "ปกติ", color: "bg-success/10 text-success border-success/20" };
    if (bmiValue < 25) return { label: "น้ำหนักเกิน", color: "bg-warning/10 text-warning border-warning/20" };
    return { label: "อ้วน", color: "bg-destructive/10 text-destructive border-destructive/20" };
  };

  return (
    <div className="p-4 bg-muted/30 rounded-xl space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2 text-primary">
        <Activity className="w-4 h-4" />
        Vital Signs
      </h4>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Blood Pressure */}
        {(data.systolic || data.diastolic) && (
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">ความดันโลหิต</p>
              <p className="font-medium">
                {data.systolic || "-"}/{data.diastolic || "-"} 
                <span className="text-xs text-muted-foreground ml-1">mmHg</span>
              </p>
            </div>
          </div>
        )}

        {/* Pulse */}
        {data.pulse && (
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">ชีพจร</p>
              <p className="font-medium">
                {data.pulse} 
                <span className="text-xs text-muted-foreground ml-1">bpm</span>
              </p>
            </div>
          </div>
        )}

        {/* Weight */}
        {data.weight && (
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-info" />
            <div>
              <p className="text-xs text-muted-foreground">น้ำหนัก</p>
              <p className="font-medium">
                {data.weight} 
                <span className="text-xs text-muted-foreground ml-1">kg</span>
              </p>
            </div>
          </div>
        )}

        {/* Height */}
        {data.height && (
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-info" />
            <div>
              <p className="text-xs text-muted-foreground">ส่วนสูง</p>
              <p className="font-medium">
                {data.height} 
                <span className="text-xs text-muted-foreground ml-1">cm</span>
              </p>
            </div>
          </div>
        )}

        {/* Temperature */}
        {data.temperature && (
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">อุณหภูมิ</p>
              <p className="font-medium">
                {data.temperature} 
                <span className="text-xs text-muted-foreground ml-1">°C</span>
              </p>
            </div>
          </div>
        )}

        {/* SpO2 */}
        {data.oxygen_saturation && (
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">SpO2</p>
              <p className="font-medium">
                {data.oxygen_saturation} 
                <span className="text-xs text-muted-foreground ml-1">%</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* BMI Calculation */}
      {bmi && (
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">BMI:</span>
            <span className="font-semibold">{bmi}</span>
            <Badge variant="outline" className={getBmiCategory(parseFloat(bmi)).color}>
              {getBmiCategory(parseFloat(bmi)).label}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};

export default VitalSignsDisplay;
