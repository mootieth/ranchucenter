import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Plus, 
  Pill, 
  Calendar,
  User,
  AlertTriangle,
  Loader2,
  Trash2,
  CreditCard,
  CheckCircle2,
  XCircle,
  Eye
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { usePrescriptions, useCreatePrescription, useMedications, useUpdatePrescriptionStatus, Prescription } from "@/hooks/usePrescriptions";
import { usePatients } from "@/hooks/usePatients";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const statusStyles: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  active: "bg-success/10 text-success border-success/20",
  dispensed: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-muted text-muted-foreground",
  discontinued: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<string, string> = {
  pending: "รอจ่าย",
  active: "ใช้อยู่",
  dispensed: "จ่ายยาแล้ว",
  completed: "สิ้นสุด",
  discontinued: "หยุดใช้",
  cancelled: "ยกเลิก",
};

const paymentStatusStyles: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  paid: "bg-success/10 text-success border-success/20",
};

const paymentStatusLabels: Record<string, string> = {
  pending: "รอชำระเงิน",
  paid: "ชำระแล้ว",
};

interface MedicationItem {
  medication_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

const Prescriptions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isNewPrescriptionOpen, setIsNewPrescriptionOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    patient_id: "",
    notes: "",
  });
  const [medicationItems, setMedicationItems] = useState<MedicationItem[]>([
    { medication_id: "", medication_name: "", dosage: "", frequency: "", duration: "", quantity: 0, instructions: "" }
  ]);

  const { data: prescriptions = [], isLoading } = usePrescriptions(searchQuery, statusFilter);
  const { data: patients = [] } = usePatients();
  const { data: medications = [] } = useMedications();
  const createPrescription = useCreatePrescription();
  const updateStatus = useUpdatePrescriptionStatus();

  const getPatientInitials = (rx: Prescription) => {
    if (!rx.patients) return "?";
    const first = rx.patients.first_name?.[0] || "";
    const last = rx.patients.last_name?.[0] || "";
    return `${first}${last}`;
  };

  const getPatientName = (rx: Prescription) => {
    if (!rx.patients) return "ไม่ระบุ";
    const prefix = rx.patients.prefix || "";
    return `${prefix}${rx.patients.first_name} ${rx.patients.last_name}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "d MMM yyyy", { locale: th });
    } catch {
      return dateStr;
    }
  };

  const addMedicationItem = () => {
    setMedicationItems([
      ...medicationItems,
      { medication_id: "", medication_name: "", dosage: "", frequency: "", duration: "", quantity: 0, instructions: "" }
    ]);
  };

  const removeMedicationItem = (index: number) => {
    setMedicationItems(medicationItems.filter((_, i) => i !== index));
  };

  const updateMedicationItem = (index: number, field: keyof MedicationItem, value: string | number) => {
    const updated = [...medicationItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === "medication_id") {
      const med = medications.find(m => m.id === value);
      if (med) {
        updated[index].medication_name = `${med.name}${med.strength ? ` ${med.strength}` : ""}`;
      }
    }
    
    setMedicationItems(updated);
  };

  const handleSubmit = async () => {
    if (!formData.patient_id) {
      toast.error("กรุณาเลือกผู้ป่วย");
      return;
    }

    const validItems = medicationItems.filter(item => item.medication_name && item.dosage && item.frequency && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error("กรุณาเพิ่มรายการยาอย่างน้อย 1 รายการ");
      return;
    }

    try {
      await createPrescription.mutateAsync({
        prescription: {
          patient_id: formData.patient_id,
          notes: formData.notes || null,
          provider_id: user?.id || null,
          status: "pending",
        },
        items: validItems.map(item => ({
          medication_id: item.medication_id || null,
          medication_name: item.medication_name,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration || null,
          quantity: item.quantity,
          instructions: item.instructions || null,
        })),
      });

      toast.success("บันทึกใบสั่งยาสำเร็จ");
      setIsNewPrescriptionOpen(false);
      setFormData({ patient_id: "", notes: "" });
      setMedicationItems([{ medication_id: "", medication_name: "", dosage: "", frequency: "", duration: "", quantity: 0, instructions: "" }]);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleDispense = async (rx: Prescription) => {
    try {
      await updateStatus.mutateAsync({ id: rx.id, status: "dispensed" });
      toast.success("บันทึกการจ่ายยาสำเร็จ");
      setSelectedPrescription(null);
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const handleCancel = async (rx: Prescription) => {
    try {
      await updateStatus.mutateAsync({ id: rx.id, status: "cancelled" });
      toast.success("ยกเลิกใบสั่งยาสำเร็จ");
      setSelectedPrescription(null);
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const isPaymentCompleted = (rx: Prescription) => {
    return rx.billing_status === "paid";
  };

  if (isLoading) {
    return (
      <MainLayout title="การจ่ายยา">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="การจ่ายยา">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อ, HN, เบอร์โทร, เลขบัตรประชาชน, ชื่อยา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 input-focus"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="pending">รอจ่าย</SelectItem>
            <SelectItem value="dispensed">จ่ายยาแล้ว</SelectItem>
            <SelectItem value="active">ใช้อยู่</SelectItem>
            <SelectItem value="completed">สิ้นสุด</SelectItem>
            <SelectItem value="discontinued">หยุดใช้</SelectItem>
            <SelectItem value="cancelled">ยกเลิก</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isNewPrescriptionOpen} onOpenChange={setIsNewPrescriptionOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              สั่งยาใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>สั่งยาใหม่</DialogTitle>
              <DialogDescription>กรอกรายละเอียดใบสั่งยาสำหรับผู้ป่วย</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>ผู้ป่วย *</Label>
                <Select
                  value={formData.patient_id}
                  onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ป่วย" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.prefix}{patient.first_name} {patient.last_name} ({patient.hn})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>รายการยา *</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addMedicationItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    เพิ่มยา
                  </Button>
                </div>
                
                {medicationItems.map((item, index) => (
                  <div key={index} className="p-3 bg-muted/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">รายการที่ {index + 1}</span>
                      {medicationItems.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeMedicationItem(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={item.medication_id}
                        onValueChange={(value) => updateMedicationItem(index, "medication_id", value)}
                      >
                        <SelectTrigger className="col-span-2">
                          <SelectValue placeholder="เลือกยา" />
                        </SelectTrigger>
                        <SelectContent>
                          {medications.map((med) => (
                            <SelectItem key={med.id} value={med.id}>
                              {med.name} {med.strength}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input 
                        placeholder="ขนาด (เช่น 1 เม็ด)" 
                        value={item.dosage}
                        onChange={(e) => updateMedicationItem(index, "dosage", e.target.value)}
                      />
                      <Input 
                        placeholder="วิธีใช้ (เช่น วันละ 1 ครั้ง)" 
                        value={item.frequency}
                        onChange={(e) => updateMedicationItem(index, "frequency", e.target.value)}
                      />
                      <Input 
                        placeholder="จำนวน" 
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) => updateMedicationItem(index, "quantity", parseInt(e.target.value) || 0)}
                      />
                      <Input 
                        placeholder="ระยะเวลา (เช่น 30 วัน)" 
                        value={item.duration}
                        onChange={(e) => updateMedicationItem(index, "duration", e.target.value)}
                      />
                    </div>
                    <Input 
                      placeholder="คำแนะนำเพิ่มเติม" 
                      value={item.instructions}
                      onChange={(e) => updateMedicationItem(index, "instructions", e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>หมายเหตุ</Label>
                <Textarea 
                  placeholder="หมายเหตุเพิ่มเติม" 
                  rows={2}
                  className="input-focus"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsNewPrescriptionOpen(false)}>
                  ยกเลิก
                </Button>
                <Button 
                  className="bg-gradient-primary" 
                  onClick={handleSubmit}
                  disabled={createPrescription.isPending}
                >
                  {createPrescription.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  บันทึก
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Prescriptions Table */}
      {prescriptions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Pill className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>ไม่พบใบสั่งยา</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">ผู้ป่วย</TableHead>
                <TableHead className="font-semibold">วันที่สั่ง</TableHead>
                <TableHead className="font-semibold">รายการยา</TableHead>
                <TableHead className="font-semibold">แพทย์</TableHead>
                <TableHead className="font-semibold">การชำระเงิน</TableHead>
                <TableHead className="font-semibold">สถานะจ่ายยา</TableHead>
                <TableHead className="font-semibold w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((rx) => (
                <TableRow 
                  key={rx.id} 
                  className="table-row-hover cursor-pointer"
                  onClick={() => setSelectedPrescription(rx)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                          {getPatientInitials(rx)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{getPatientName(rx)}</p>
                        <p className="text-xs text-muted-foreground font-mono">{rx.patients?.hn || "-"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {formatDate(rx.prescription_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {rx.prescription_items?.slice(0, 2).map((item, index) => (
                        <div key={index} className="flex items-center gap-1.5 text-sm">
                          <Pill className="w-3.5 h-3.5 text-primary" />
                          <span className="truncate max-w-[200px]">{item.medication_name}</span>
                        </div>
                      ))}
                      {(rx.prescription_items?.length || 0) > 2 && (
                        <span className="text-xs text-muted-foreground">+{(rx.prescription_items?.length || 0) - 2} รายการ</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {rx.provider_profile?.full_name || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rx.billing_status ? (
                      <Badge 
                        variant="outline" 
                        className={cn(paymentStatusStyles[rx.billing_status] || paymentStatusStyles.pending)}
                      >
                        <CreditCard className="w-3 h-3 mr-1" />
                        {paymentStatusLabels[rx.billing_status] || "รอชำระเงิน"}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">ไม่มีบิล</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn(statusStyles[rx.status || "pending"])}
                    >
                      {statusLabels[rx.status || "pending"]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedPrescription(rx); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedPrescription} onOpenChange={(open) => !open && setSelectedPrescription(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPrescription && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-primary" />
                  รายละเอียดใบสั่งยา
                </DialogTitle>
                <DialogDescription>
                  {getPatientName(selectedPrescription)} ({selectedPrescription.patients?.hn || "-"})
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Patient & Date Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">วันที่สั่งยา:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedPrescription.prescription_date)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">แพทย์:</span>
                    <span className="ml-2 font-medium">{selectedPrescription.provider_profile?.full_name || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">สถานะจ่ายยา:</span>
                    <Badge variant="outline" className={cn(statusStyles[selectedPrescription.status || "pending"])}>
                      {statusLabels[selectedPrescription.status || "pending"]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">การชำระเงิน:</span>
                    {selectedPrescription.billing_status ? (
                      <Badge variant="outline" className={cn(paymentStatusStyles[selectedPrescription.billing_status] || paymentStatusStyles.pending)}>
                        <CreditCard className="w-3 h-3 mr-1" />
                        {paymentStatusLabels[selectedPrescription.billing_status] || "รอชำระเงิน"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">ไม่มีบิล</span>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Medication Items */}
                <div>
                  <h4 className="font-semibold mb-3">รายการยา ({selectedPrescription.prescription_items?.length || 0} รายการ)</h4>
                  <div className="space-y-3">
                    {selectedPrescription.prescription_items?.map((item, index) => (
                      <div key={index} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Pill className="w-4 h-4 text-primary mt-0.5" />
                            <div>
                              <p className="font-medium">{item.medication_name}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                                <span>ขนาด: {item.dosage}</span>
                                <span>วิธีใช้: {item.frequency}</span>
                                {item.duration && <span>ระยะเวลา: {item.duration}</span>}
                              </div>
                              {item.instructions && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  <AlertTriangle className="w-3 h-3 inline mr-1 text-warning" />
                                  {item.instructions}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-2 shrink-0">
                            {item.quantity} เม็ด
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPrescription.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-1">หมายเหตุ</h4>
                      <p className="text-sm text-muted-foreground">{selectedPrescription.notes}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Actions - only show for pending prescriptions */}
              {selectedPrescription.status === "pending" && (
                <DialogFooter className="gap-2 sm:gap-0 pt-4">
                   {!isPaymentCompleted(selectedPrescription) && selectedPrescription.billing_status !== null && (
                    <div className="mr-auto flex items-center gap-2">
                      <p className="text-xs text-warning flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        ต้องชำระเงินก่อนจึงจะจ่ายยาได้
                      </p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-xs h-auto p-0 text-primary"
                        onClick={() => {
                          setSelectedPrescription(null);
                          navigate("/billing");
                        }}
                      >
                        ไปหน้าชำระเงิน →
                      </Button>
                    </div>
                   )}
                  <Button 
                    variant="outline" 
                    onClick={() => handleCancel(selectedPrescription)}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    ยกเลิกใบสั่งยา
                  </Button>
                  <Button
                    className="bg-gradient-primary hover:opacity-90"
                    onClick={() => handleDispense(selectedPrescription)}
                    disabled={updateStatus.isPending || (selectedPrescription.billing_status !== null && !isPaymentCompleted(selectedPrescription))}
                  >
                    {updateStatus.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    )}
                    บันทึกจ่ายยาสำเร็จ
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Prescriptions;