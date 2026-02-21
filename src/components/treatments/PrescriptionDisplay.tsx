import { Pill, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePrescriptionByTreatment } from "@/hooks/usePrescriptionByTreatment";
import { useUpdatePrescriptionStatus } from "@/hooks/usePrescriptions";
import { toast } from "sonner";

interface PrescriptionDisplayProps {
  treatmentId: string;
}

const statusLabels: Record<string, string> = {
  pending: "รอจ่ายยา",
  dispensed: "จ่ายยาแล้ว",
  cancelled: "ยกเลิก",
};

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  dispensed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const PrescriptionDisplay = ({ treatmentId }: PrescriptionDisplayProps) => {
  const { data: prescription, isLoading } =
    usePrescriptionByTreatment(treatmentId);
  const updateStatus = useUpdatePrescriptionStatus();

  const handleStatusChange = async (newStatus: string) => {
    if (!prescription) return;

    try {
      await updateStatus.mutateAsync({
        id: prescription.id,
        status: newStatus,
      });
      toast.success(
        newStatus === "dispensed"
          ? "จ่ายยาเรียบร้อยแล้ว"
          : "ยกเลิกใบสั่งยาแล้ว",
      );
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          กำลังโหลดใบสั่งยา...
        </span>
      </div>
    );
  }

  if (!prescription || !prescription.prescription_items?.length) {
    return null;
  }

  const currentStatus = prescription.status || "pending";
  const isPending = currentStatus === "pending";

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-primary" />
            ใบสั่งยา
            <Badge variant="secondary" className="text-xs">
              {prescription.prescription_items.length} รายการ
            </Badge>
          </div>
          <Badge variant="outline" className={statusColors[currentStatus]}>
            {statusLabels[currentStatus] || currentStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs font-medium">ยา</TableHead>
                <TableHead className="text-xs font-medium">ขนาด</TableHead>
                <TableHead className="text-xs font-medium">ความถี่</TableHead>
                <TableHead className="text-xs font-medium">ระยะเวลา</TableHead>
                <TableHead className="text-xs font-medium text-right">
                  จำนวน
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescription.prescription_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm font-medium">
                    {item.medication_name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.dosage}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.frequency}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.duration || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-right">
                    {item.quantity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {prescription.notes && (
          <p className="text-xs text-muted-foreground italic">
            {prescription.notes}
          </p>
        )}

        {/* Action Buttons - only show when pending */}
        {isPending && (
          <div className="flex gap-2 pt-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  )}
                  จ่ายยาแล้ว
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันการจ่ายยา</AlertDialogTitle>
                  <AlertDialogDescription>
                    ยืนยันว่าได้จ่ายยาทั้ง{" "}
                    {prescription.prescription_items.length}{" "}
                    รายการให้ผู้ป่วยแล้ว
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-12 w-12 text-xl ml-4 flex items-center justify-center">
                    ยกเลิก
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-success hover:bg-success/90 text-success-foreground h-12 w-32 text-xl flex items-center justify-center ml-4"
                    onClick={() => handleStatusChange("dispensed")}
                  >
                    ยืนยันจ่ายยา
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  ยกเลิก
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันการยกเลิกใบสั่งยา</AlertDialogTitle>
                  <AlertDialogDescription>
                    คุณต้องการยกเลิกใบสั่งยานี้ใช่หรือไม่?
                    การกระทำนี้ไม่สามารถย้อนกลับได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ไม่ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    onClick={() => handleStatusChange("cancelled")}
                  >
                    ยืนยันยกเลิก
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrescriptionDisplay;
