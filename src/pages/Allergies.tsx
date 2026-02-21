import { useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { 
  Search, 
  Plus, 
  AlertTriangle, 
  User,
  Shield,
  AlertCircle,
  Loader2
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAllergies, useCreateAllergy } from "@/hooks/useAllergies";
import { usePatients } from "@/hooks/usePatients";

const severityStyles = {
  mild: { bg: "bg-info/10", text: "text-info", border: "border-info/20", label: "เล็กน้อย" },
  moderate: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20", label: "ปานกลาง" },
  severe: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", label: "รุนแรง" },
};

const typeLabels: Record<string, string> = {
  medication: "ยา",
  food: "อาหาร",
  environmental: "สิ่งแวดล้อม",
  other: "อื่นๆ",
};

const Allergies = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [isNewAllergyOpen, setIsNewAllergyOpen] = useState(false);

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [allergenType, setAllergenType] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [allergen, setAllergen] = useState<string>("");
  const [reaction, setReaction] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const { data: allergies = [], isLoading } = useAllergies();
  const { data: patients = [] } = usePatients();
  const createAllergy = useCreateAllergy();

  const filteredAllergies = allergies.filter((allergy) => {
    const patientName = allergy.patients 
      ? `${allergy.patients.first_name} ${allergy.patients.last_name}`
      : "";
    const patientHn = allergy.patients?.hn || "";
    
    const matchesSearch = 
      patientName.includes(searchQuery) ||
      patientHn.includes(searchQuery) ||
      allergy.allergen.includes(searchQuery);
    const matchesSeverity = severityFilter === "all" || allergy.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const severeCount = allergies.filter(a => a.severity === "severe").length;
  const totalPatients = new Set(allergies.map(a => a.patient_id)).size;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  const handleSubmit = () => {
    if (!selectedPatient || !allergen || !allergenType || !severity) {
      return;
    }

    createAllergy.mutate({
      patient_id: selectedPatient,
      allergen,
      allergen_type: allergenType,
      severity,
      reaction: reaction || null,
      notes: notes || null,
    }, {
      onSuccess: () => {
        setIsNewAllergyOpen(false);
        setSelectedPatient("");
        setAllergenType("");
        setSeverity("");
        setAllergen("");
        setReaction("");
        setNotes("");
      }
    });
  };

  return (
    <MainLayout title="ประวัติแพ้ยา">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">แพ้รุนแรง</p>
                <p className="text-2xl font-bold text-destructive">{severeCount}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ผู้ป่วยที่มีประวัติแพ้</p>
                <p className="text-2xl font-bold">{totalPatients}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">รายการแพ้ทั้งหมด</p>
                <p className="text-2xl font-bold">{allergies.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาชื่อผู้ป่วย, HN, สารก่อภูมิแพ้..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 input-focus"
          />
        </div>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="ความรุนแรง" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="severe">รุนแรง</SelectItem>
            <SelectItem value="moderate">ปานกลาง</SelectItem>
            <SelectItem value="mild">เล็กน้อย</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isNewAllergyOpen} onOpenChange={setIsNewAllergyOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              บันทึกแพ้ยาใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>บันทึกประวัติแพ้ยา/อาหาร</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>ผู้ป่วย</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกผู้ป่วย" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} ({patient.hn})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ประเภท</Label>
                  <Select value={allergenType} onValueChange={setAllergenType}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medication">ยา</SelectItem>
                      <SelectItem value="food">อาหาร</SelectItem>
                      <SelectItem value="environmental">สิ่งแวดล้อม</SelectItem>
                      <SelectItem value="other">อื่นๆ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ความรุนแรง</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกความรุนแรง" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">เล็กน้อย</SelectItem>
                      <SelectItem value="moderate">ปานกลาง</SelectItem>
                      <SelectItem value="severe">รุนแรง</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>สารก่อภูมิแพ้</Label>
                <Input 
                  placeholder="ชื่อยาหรืออาหารที่แพ้" 
                  className="input-focus"
                  value={allergen}
                  onChange={(e) => setAllergen(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>อาการที่เกิดขึ้น</Label>
                <Textarea 
                  placeholder="อธิบายอาการแพ้ที่เกิดขึ้น" 
                  rows={2}
                  className="input-focus"
                  value={reaction}
                  onChange={(e) => setReaction(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>หมายเหตุ</Label>
                <Textarea 
                  placeholder="หมายเหตุเพิ่มเติม" 
                  rows={2}
                  className="input-focus"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsNewAllergyOpen(false)}>
                  ยกเลิก
                </Button>
                <Button 
                  className="bg-gradient-primary" 
                  onClick={handleSubmit}
                  disabled={createAllergy.isPending || !selectedPatient || !allergen || !allergenType || !severity}
                >
                  {createAllergy.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    "บันทึก"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Allergies Table */}
      <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">ผู้ป่วย</TableHead>
                <TableHead className="font-semibold">สารก่อภูมิแพ้</TableHead>
                <TableHead className="font-semibold">ประเภท</TableHead>
                <TableHead className="font-semibold">อาการ</TableHead>
                <TableHead className="font-semibold">ความรุนแรง</TableHead>
                <TableHead className="font-semibold">วันที่บันทึก</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAllergies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    ไม่พบข้อมูลประวัติแพ้ยา
                  </TableCell>
                </TableRow>
              ) : (
                filteredAllergies.map((allergy) => {
                  const patientName = allergy.patients 
                    ? `${allergy.patients.first_name} ${allergy.patients.last_name}`
                    : "ไม่ทราบชื่อ";
                  const patientInitials = allergy.patients 
                    ? getInitials(allergy.patients.first_name, allergy.patients.last_name)
                    : "??";
                  const patientHn = allergy.patients?.hn || "-";
                  const severityKey = (allergy.severity || "mild") as keyof typeof severityStyles;
                  const allergenTypeKey = allergy.allergen_type || "medication";

                  return (
                    <TableRow key={allergy.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                                {patientInitials}
                              </AvatarFallback>
                            </Avatar>
                            {allergy.severity === "severe" && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                                <AlertCircle className="w-3 h-3 text-destructive-foreground" />
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{patientName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{patientHn}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={cn(
                            "w-4 h-4",
                            allergy.severity === "severe" ? "text-destructive" : 
                            allergy.severity === "moderate" ? "text-warning" : "text-info"
                          )} />
                          <span className="font-medium">{allergy.allergen}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {typeLabels[allergenTypeKey] || allergenTypeKey}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm max-w-xs">{allergy.reaction || "-"}</p>
                        {allergy.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{allergy.notes}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            severityStyles[severityKey].bg,
                            severityStyles[severityKey].text,
                            severityStyles[severityKey].border
                          )}
                        >
                          {severityStyles[severityKey].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(new Date(allergy.created_at), "d MMM yyyy", { locale: th })}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </MainLayout>
  );
};

export default Allergies;
