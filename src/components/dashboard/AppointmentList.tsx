import { Clock, MapPin, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useTodayAppointments } from "@/hooks/useAppointments";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const typeLabels: Record<string, string> = {
  consultation: "ปรึกษา/บำบัด",
  assessment: "ตรวจประเมิน",
  follow_up: "ติดตามอาการ",
  diagnosis: "ตรวจวินิจฉัย",
};

const statusStyles: Record<string, string> = {
  scheduled: "bg-info/10 text-info border-info/20",
  confirmed: "bg-info/10 text-info border-info/20",
  checked_in: "bg-warning/10 text-warning border-warning/20",
  in_progress: "bg-success/10 text-success border-success/20 animate-pulse",
  completed: "bg-muted text-muted-foreground border-muted",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-muted text-muted-foreground border-muted",
};

const statusLabels: Record<string, string> = {
  scheduled: "ทำนัดหมาย",
  confirmed: "ยืนยันนัดหมาย",
  checked_in: "เช็คอินแล้ว",
  in_progress: "กำลังพบ",
  completed: "เสร็จสิ้น",
  no_show: "ไม่มา",
  cancelled: "ยกเลิก",
};

const AppointmentList = () => {
  const { data: appointments, isLoading } = useTodayAppointments();
  const { hasPermission } = useAuth();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`;
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-soft p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">นัดหมายวันนี้</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-soft p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">นัดหมายวันนี้</h3>
        {hasPermission("appointments") && (
          <Button variant="ghost" size="sm" className="text-primary" asChild>
            <Link to="/appointments">ดูทั้งหมด</Link>
          </Button>
        )}
      </div>

      {!appointments || appointments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">ไม่มีนัดหมายวันนี้</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <Link
              key={apt.id}
              to={`/patients/${apt.patient_id}`}
              className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer block"
            >
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {apt.patients ? getInitials(apt.patients.first_name, apt.patients.last_name) : "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">
                    {apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : "ไม่ระบุ"}
                  </p>
                  <Badge variant="outline" className="text-xs font-normal">
                    {typeLabels[apt.appointment_type || "consultation"] || apt.appointment_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(apt.start_time)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    ที่คลินิก
                  </span>
                </div>
              </div>

              <Badge 
                variant="outline" 
                className={cn("text-xs", statusStyles[apt.status || "scheduled"])}
              >
                {statusLabels[apt.status || "scheduled"]}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default AppointmentList;
