import { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, parseISO } from "date-fns";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  Pill,
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  Filter,
  TrendingUp,
  DollarSign,
  PackagePlus,
  BarChart3,
  FileBarChart,
  CalendarIcon,
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  RefreshCw,
  Clock,
  Download,
  FileText,
} from "lucide-react";
import { exportInventoryCSV, exportInventoryPDF, exportUsageReportCSV, exportUsageReportPDF, exportMovementsCSV, exportMovementsPDF } from "@/utils/inventoryExport";
import { useMedicationUsageReport } from "@/hooks/useMedicationUsageReport";
import { useStockMovements, useCreateStockMovement } from "@/hooks/useStockMovements";
import { DateInput } from "@/components/ui/date-input";
import { useToast } from "@/hooks/use-toast";
import {
  useMedications,
  useMedicationCategories,
  useMedicationStats,
  useCreateMedication,
  useUpdateMedication,
  useDeleteMedication,
  useUpdateStock,
  type Medication,
} from "@/hooks/useMedications";

const DOSAGE_FORMS = [
  "Tablet", "Capsule", "Softgel", "Syrup", "Injection",
  "Cream", "Ointment", "Drops", "Patch", "Inhaler",
];

const CATEGORIES = [
  "Antidepressant", "Anxiolytic", "Antipsychotic", "Mood Stabilizer",
  "Hypnotic", "ADHD", "Beta-blocker", "Antihistamine", "Supplement", "Other",
];

const categoryTranslation: Record<string, string> = {
  Antidepressant: "ยาแก้ซึมเศร้า",
  Anxiolytic: "ยาคลายกังวล",
  Antipsychotic: "ยาต้านโรคจิต",
  "Mood Stabilizer": "ยาควบคุมอารมณ์",
  Hypnotic: "ยานอนหลับ",
  ADHD: "ยารักษา ADHD",
  "Beta-blocker": "ยาต้านเบต้า",
  Antihistamine: "ยาแก้แพ้",
  Supplement: "วิตามิน/อาหารเสริม",
  Other: "อื่นๆ",
};

const InventoryManagement = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);

  // Add/Edit medication dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Stock adjustment dialog
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [addStockQuantity, setAddStockQuantity] = useState(0);

  // Price update dialog
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [newSellingPrice, setNewSellingPrice] = useState(0);
  const [newCostPrice, setNewCostPrice] = useState(0);

  // Report date range
  const [reportStartDate, setReportStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [reportEndDate, setReportEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  // New medication form
  const [formData, setFormData] = useState({
    name: "",
    generic_name: "",
    category: "",
    strength: "",
    dosage_form: "",
    unit: "เม็ด",
    instructions: "",
    price: 0,
    cost_price: 0,
    stock_quantity: 0,
    min_stock: 10,
    contraindications: "",
    side_effects: "",
    is_active: true,
    expiry_date: "",
  });

  const { data: medications, isLoading } = useMedications(searchQuery, categoryFilter, !showInactive);
  const { data: categories } = useMedicationCategories();
  const { data: stats } = useMedicationStats();
  const createMutation = useCreateMedication();
  const updateMutation = useUpdateMedication();
  const deleteMutation = useDeleteMedication();
  const updateStockMutation = useUpdateStock();
  const createStockMovement = useCreateStockMovement();
  // Movement date range
  const [movementStartDate, setMovementStartDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [movementEndDate, setMovementEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [movementTypeFilter, setMovementTypeFilter] = useState("all");

  const { data: stockMovements, isLoading: isMovementsLoading } = useStockMovements(undefined, 500, movementStartDate, movementEndDate);

  const filteredMovements = useMemo(() => {
    if (!stockMovements) return [];
    if (movementTypeFilter === "all") return stockMovements;
    return stockMovements.filter((m) => m.movement_type === movementTypeFilter);
  }, [stockMovements, movementTypeFilter]);
  const { data: usageReport, isLoading: isReportLoading } = useMedicationUsageReport(reportStartDate, reportEndDate);

  const totalUsageQuantity = useMemo(() => usageReport?.reduce((sum, item) => sum + item.total_quantity, 0) || 0, [usageReport]);
  const totalPrescriptionCount = useMemo(() => {
    const ids = new Set<string>();
    // prescription_count in each item is per-medication, so sum unique
    return usageReport?.reduce((sum, item) => sum + item.prescription_count, 0) || 0;
  }, [usageReport]);

  const isLowStock = (med: Medication) =>
    (med.stock_quantity || 0) <= (med.min_stock || 10);

  const lowStockMeds = medications?.filter(isLowStock) || [];

  // Calculate inventory value
  const totalInventoryValue = medications?.reduce(
    (sum, med) => sum + (med.price || 0) * (med.stock_quantity || 0), 0
  ) || 0;

  const totalCostValue = medications?.reduce(
    (sum, med) => sum + ((med as any).cost_price || 0) * (med.stock_quantity || 0), 0
  ) || 0;

  // Expiry helpers
  const EXPIRY_WARNING_DAYS = 90; // แจ้งเตือนยาที่จะหมดอายุภายใน 90 วัน

  const getExpiryStatus = (med: Medication) => {
    const expiryDate = (med as any).expiry_date;
    if (!expiryDate) return null;
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return "expired";
    if (days <= EXPIRY_WARNING_DAYS) return "near-expiry";
    return "ok";
  };

  const nearExpiryMeds = useMemo(() =>
    (medications || []).filter((med) => {
      const status = getExpiryStatus(med);
      return status === "expired" || status === "near-expiry";
    }).sort((a, b) => {
      const dateA = (a as any).expiry_date || "9999-12-31";
      const dateB = (b as any).expiry_date || "9999-12-31";
      return dateA.localeCompare(dateB);
    }),
    [medications]
  );

  const resetForm = () => {
    setFormData({
      name: "", generic_name: "", category: "", strength: "",
      dosage_form: "", unit: "เม็ด", instructions: "", price: 0,
      cost_price: 0, stock_quantity: 0, min_stock: 10,
      contraindications: "", side_effects: "", is_active: true,
      expiry_date: "",
    });
  };

  const handleOpenEditDialog = (med: Medication) => {
    setSelectedMedication(med);
    setIsEditMode(true);
    setFormData({
      name: med.name,
      generic_name: med.generic_name || "",
      category: med.category || "",
      strength: med.strength || "",
      dosage_form: med.dosage_form || "",
      unit: med.unit || "เม็ด",
      instructions: med.instructions || "",
      price: med.price || 0,
      cost_price: (med as any).cost_price || 0,
      stock_quantity: med.stock_quantity || 0,
      min_stock: med.min_stock || 10,
      contraindications: med.contraindications || "",
      side_effects: med.side_effects || "",
      is_active: med.is_active ?? true,
      expiry_date: (med as any).expiry_date || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmitMedication = async () => {
    if (!formData.name) {
      toast({ title: "กรุณากรอกชื่อยา", variant: "destructive" });
      return;
    }
    try {
      if (isEditMode && selectedMedication) {
        await updateMutation.mutateAsync({ id: selectedMedication.id, ...formData } as any);
        toast({ title: "บันทึกข้อมูลยาเรียบร้อย" });
      } else {
        await createMutation.mutateAsync(formData as any);
        toast({ title: "เพิ่มยาใหม่เรียบร้อย" });
      }
      setIsAddDialogOpen(false);
      setIsEditMode(false);
      setSelectedMedication(null);
      resetForm();
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedMedication) return;
    try {
      await deleteMutation.mutateAsync(selectedMedication.id);
      toast({ title: "ยกเลิกการใช้งานยาเรียบร้อย" });
      setDeleteDialogOpen(false);
      setSelectedMedication(null);
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    }
  };

  const handleOpenStockDialog = (med: Medication) => {
    setSelectedMedication(med);
    setAddStockQuantity(0);
    setIsStockDialogOpen(true);
  };

  const handleAddStock = async () => {
    if (!selectedMedication || addStockQuantity <= 0) return;
    try {
      const previousStock = selectedMedication.stock_quantity || 0;
      const newQuantity = previousStock + addStockQuantity;
      await updateStockMutation.mutateAsync({ id: selectedMedication.id, quantity: newQuantity });
      await createStockMovement.mutateAsync({
        medication_id: selectedMedication.id,
        movement_type: "in",
        quantity: addStockQuantity,
        previous_stock: previousStock,
        new_stock: newQuantity,
        reference_type: "manual",
        notes: `เพิ่มสต็อก ${addStockQuantity} ${selectedMedication.unit}`,
      });
      toast({ title: `เพิ่มสต็อก ${selectedMedication.name} จำนวน ${addStockQuantity} ${selectedMedication.unit} เรียบร้อย` });
      setIsStockDialogOpen(false);
      setSelectedMedication(null);
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    }
  };

  const handleOpenPriceDialog = (med: Medication) => {
    setSelectedMedication(med);
    setNewSellingPrice(med.price || 0);
    setNewCostPrice((med as any).cost_price || 0);
    setIsPriceDialogOpen(true);
  };

  const handleUpdatePrice = async () => {
    if (!selectedMedication) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedMedication.id,
        price: newSellingPrice,
        cost_price: newCostPrice,
      } as any);
      toast({ title: `อัปเดตราคา ${selectedMedication.name} เรียบร้อย` });
      setIsPriceDialogOpen(false);
      setSelectedMedication(null);
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    }
  };

  return (
    <MainLayout title="จัดการคลังยา">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">จัดการคลังยา</h1>
            <p className="text-muted-foreground">
              เพิ่มยา เติมสต็อก ปรับราคา และตรวจสอบยาคงคลัง
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { resetForm(); setIsEditMode(false); setSelectedMedication(null); setIsAddDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มรายการยาใหม่
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">รายการยาทั้งหมด</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMedications || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ยาที่ใช้งาน</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats?.activeMedications || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ยาใกล้หมด</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats?.lowStock || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ยาใกล้หมดอายุ</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats?.nearExpiry || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">มูลค่าคลัง (ราคาขาย)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">฿{totalInventoryValue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">มูลค่าคลัง (ราคาทุน)</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">฿{totalCostValue.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inventory">
              <Package className="mr-2 h-4 w-4" />
              คลังยาทั้งหมด
            </TabsTrigger>
            <TabsTrigger value="low-stock">
              <AlertTriangle className="mr-2 h-4 w-4" />
              ยาใกล้หมด ({lowStockMeds.length})
            </TabsTrigger>
            <TabsTrigger value="usage-report">
              <FileBarChart className="mr-2 h-4 w-4" />
              รายงานการใช้ยา
            </TabsTrigger>
            <TabsTrigger value="movements">
              <History className="mr-2 h-4 w-4" />
              ประวัติเคลื่อนไหว
            </TabsTrigger>
            <TabsTrigger value="expiry">
              <Clock className="mr-2 h-4 w-4" />
              ยาใกล้หมดอายุ ({nearExpiryMeds.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            {/* Search and Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="ค้นหาชื่อยา, ชื่อสามัญ หรือหมวดหมู่..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="หมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
                      {(categories || CATEGORIES).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryTranslation[cat] || cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch checked={showInactive} onCheckedChange={setShowInactive} />
                    <Label>แสดงยาที่ไม่ใช้งาน</Label>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => medications && exportInventoryCSV(medications, categoryFilter)}>
                      <Download className="mr-1 h-4 w-4" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => medications && exportInventoryPDF(medications, categoryFilter)}>
                      <FileText className="mr-1 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อยา</TableHead>
                      <TableHead>ชื่อสามัญ</TableHead>
                      <TableHead>หมวดหมู่</TableHead>
                      <TableHead>ความแรง</TableHead>
                      <TableHead className="text-right">ราคาทุน</TableHead>
                      <TableHead className="text-right">ราคาขาย</TableHead>
                      <TableHead className="text-right">คงเหลือ</TableHead>
                      <TableHead>วันหมดอายุ</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">กำลังโหลด...</TableCell>
                      </TableRow>
                    ) : medications?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">ไม่พบรายการยา</TableCell>
                      </TableRow>
                    ) : (
                      medications?.map((med) => (
                        <TableRow key={med.id} className={isLowStock(med) ? "bg-destructive/5" : ""}>
                          <TableCell className="font-medium">{med.name}</TableCell>
                          <TableCell className="text-muted-foreground">{med.generic_name || "-"}</TableCell>
                          <TableCell>
                            {med.category && (
                              <Badge variant="outline">{categoryTranslation[med.category] || med.category}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{med.strength || "-"}</TableCell>
                          <TableCell className="text-right">฿{((med as any).cost_price || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">฿{(med.price || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <span className={isLowStock(med) ? "text-destructive font-semibold" : ""}>
                              {med.stock_quantity || 0} {med.unit}
                              {isLowStock(med) && <AlertTriangle className="ml-1 h-3 w-3 inline" />}
                            </span>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const expiryDate = (med as any).expiry_date;
                              if (!expiryDate) return <span className="text-muted-foreground">-</span>;
                              const status = getExpiryStatus(med);
                              const days = differenceInDays(parseISO(expiryDate), new Date());
                              return (
                                <div className="text-sm">
                                  <div className={status === "expired" ? "text-destructive font-semibold" : status === "near-expiry" ? "text-amber-600 font-medium" : ""}>
                                    {new Date(expiryDate).toLocaleDateString("th-TH")}
                                  </div>
                                  {status === "expired" && <span className="text-xs text-destructive">หมดอายุแล้ว</span>}
                                  {status === "near-expiry" && <span className="text-xs text-amber-600">อีก {days} วัน</span>}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={med.is_active ? "default" : "secondary"}>
                              {med.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                            </Badge>
                          </TableCell>
                           <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEditDialog(med)} title="แก้ไข">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenStockDialog(med)} title="เพิ่มสต็อก">
                                <PackagePlus className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenPriceDialog(med)} title="ปรับราคา">
                                <TrendingUp className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedMedication(med); setDeleteDialogOpen(true); }} title="ยกเลิกใช้งาน">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="low-stock" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อยา</TableHead>
                      <TableHead>หมวดหมู่</TableHead>
                      <TableHead className="text-right">คงเหลือ</TableHead>
                      <TableHead className="text-right">ขั้นต่ำ</TableHead>
                      <TableHead className="text-right">ต้องเติม</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockMeds.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          ไม่มียาที่ใกล้หมด 🎉
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStockMeds.map((med) => (
                        <TableRow key={med.id} className="bg-destructive/5">
                          <TableCell className="font-medium">
                            <div>
                              <div>{med.name}</div>
                              <div className="text-xs text-muted-foreground">{med.strength}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{categoryTranslation[med.category || ""] || med.category || "-"}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-destructive font-semibold">
                            {med.stock_quantity || 0} {med.unit}
                          </TableCell>
                          <TableCell className="text-right">{med.min_stock || 10} {med.unit}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {Math.max(0, (med.min_stock || 10) * 2 - (med.stock_quantity || 0))} {med.unit}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => handleOpenStockDialog(med)}>
                              <PackagePlus className="mr-1 h-4 w-4" />
                              เติมสต็อก
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Report Tab */}
          <TabsContent value="usage-report" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">เลือกช่วงวันที่</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => usageReport && exportUsageReportCSV(usageReport, reportStartDate, reportEndDate)}>
                      <Download className="mr-1 h-4 w-4" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => usageReport && exportUsageReportPDF(usageReport, reportStartDate, reportEndDate)}>
                      <FileText className="mr-1 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                  <div className="space-y-2">
                    <Label>วันที่เริ่มต้น</Label>
                    <DateInput
                      value={reportStartDate}
                      onChange={setReportStartDate}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่สิ้นสุด</Label>
                    <DateInput
                      value={reportEndDate}
                      onChange={setReportEndDate}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReportStartDate(format(subDays(new Date(), 7), "yyyy-MM-dd"));
                        setReportEndDate(format(new Date(), "yyyy-MM-dd"));
                      }}
                    >
                      7 วัน
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReportStartDate(format(subDays(new Date(), 30), "yyyy-MM-dd"));
                        setReportEndDate(format(new Date(), "yyyy-MM-dd"));
                      }}
                    >
                      30 วัน
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReportStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
                        setReportEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
                      }}
                    >
                      เดือนนี้
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">รายการยาที่จ่าย</CardTitle>
                  <Pill className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usageReport?.length || 0} รายการ</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">จำนวนยาที่จ่ายทั้งหมด</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{totalUsageQuantity.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">จำนวนใบสั่งยา</CardTitle>
                  <FileBarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalPrescriptionCount.toLocaleString()} ครั้ง</div>
                </CardContent>
              </Card>
            </div>

            {/* Usage Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>ชื่อยา</TableHead>
                      <TableHead className="text-right">จำนวนที่จ่าย</TableHead>
                      <TableHead className="text-right">จำนวนใบสั่งยา</TableHead>
                      <TableHead className="text-right">เฉลี่ยต่อใบ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isReportLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">กำลังโหลด...</TableCell>
                      </TableRow>
                    ) : !usageReport || usageReport.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          ไม่มีข้อมูลการจ่ายยาในช่วงเวลาที่เลือก
                        </TableCell>
                      </TableRow>
                    ) : (
                      usageReport.map((item, index) => (
                        <TableRow key={item.medication_id || item.medication_name}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-medium">{item.medication_name}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.total_quantity.toLocaleString()} {item.unit || "เม็ด"}
                          </TableCell>
                          <TableCell className="text-right">{item.prescription_count} ครั้ง</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {(item.total_quantity / item.prescription_count).toFixed(1)} {item.unit || "เม็ด"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Movements Tab */}
          <TabsContent value="movements" className="space-y-4">
            {/* Date Range Filter */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold">เลือกช่วงวันที่</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => filteredMovements.length > 0 && exportMovementsCSV(filteredMovements, movementStartDate, movementEndDate)}>
                      <Download className="mr-1 h-4 w-4" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => filteredMovements.length > 0 && exportMovementsPDF(filteredMovements, movementStartDate, movementEndDate)}>
                      <FileText className="mr-1 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                  <div className="space-y-2">
                    <Label>วันที่เริ่มต้น</Label>
                    <DateInput
                      value={movementStartDate}
                      onChange={setMovementStartDate}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันที่สิ้นสุด</Label>
                    <DateInput
                      value={movementEndDate}
                      onChange={setMovementEndDate}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ประเภท</Label>
                    <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="in">รับเข้า</SelectItem>
                        <SelectItem value="out">จ่ายออก</SelectItem>
                        <SelectItem value="adjust">ปรับปรุง</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMovementStartDate(format(subDays(new Date(), 7), "yyyy-MM-dd"));
                        setMovementEndDate(format(new Date(), "yyyy-MM-dd"));
                      }}
                    >
                      7 วัน
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMovementStartDate(format(subDays(new Date(), 30), "yyyy-MM-dd"));
                        setMovementEndDate(format(new Date(), "yyyy-MM-dd"));
                      }}
                    >
                      30 วัน
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMovementStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
                        setMovementEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
                      }}
                    >
                      เดือนนี้
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่/เวลา</TableHead>
                      <TableHead>ชื่อยา</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead className="text-right">ก่อนเปลี่ยน</TableHead>
                      <TableHead className="text-right">หลังเปลี่ยน</TableHead>
                      <TableHead>อ้างอิง</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isMovementsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">กำลังโหลด...</TableCell>
                      </TableRow>
                    ) : filteredMovements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          ไม่มีประวัติการเคลื่อนไหวในช่วงเวลาที่เลือก
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMovements.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell className="text-sm">
                            {new Date(mov.created_at).toLocaleDateString("th-TH", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                            })}{" "}
                            <span className="text-muted-foreground">
                              {new Date(mov.created_at).toLocaleTimeString("th-TH", {
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{mov.medication_name}</TableCell>
                          <TableCell>
                            {mov.movement_type === "in" && (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                <ArrowDownCircle className="mr-1 h-3 w-3" />
                                รับเข้า
                              </Badge>
                            )}
                            {mov.movement_type === "out" && (
                              <Badge variant="destructive">
                                <ArrowUpCircle className="mr-1 h-3 w-3" />
                                จ่ายออก
                              </Badge>
                            )}
                            {mov.movement_type === "adjust" && (
                              <Badge variant="secondary">
                                <RefreshCw className="mr-1 h-3 w-3" />
                                ปรับปรุง
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <span className={mov.movement_type === "in" ? "text-emerald-600" : mov.movement_type === "out" ? "text-destructive" : ""}>
                              {mov.movement_type === "in" ? "+" : mov.movement_type === "out" ? "-" : ""}{mov.quantity} {mov.medication_unit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{mov.previous_stock}</TableCell>
                          <TableCell className="text-right font-medium">{mov.new_stock}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {mov.reference_type === "manual" ? "เพิ่มสต็อก" :
                               mov.reference_type === "prescription" ? "จ่ายยา" :
                               mov.reference_type === "initial" ? "เริ่มต้น" :
                               mov.reference_type || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {mov.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expiry Tab */}
          <TabsContent value="expiry" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อยา</TableHead>
                      <TableHead>ความแรง</TableHead>
                      <TableHead>หมวดหมู่</TableHead>
                      <TableHead>วันหมดอายุ</TableHead>
                      <TableHead className="text-right">เหลืออีก</TableHead>
                      <TableHead className="text-right">คงเหลือ</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nearExpiryMeds.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          ไม่มียาที่ใกล้หมดอายุ 🎉
                        </TableCell>
                      </TableRow>
                    ) : (
                      nearExpiryMeds.map((med) => {
                        const expiryDate = (med as any).expiry_date;
                        const days = differenceInDays(parseISO(expiryDate), new Date());
                        const status = getExpiryStatus(med);
                        return (
                          <TableRow key={med.id} className={status === "expired" ? "bg-destructive/10" : "bg-amber-50/50"}>
                            <TableCell className="font-medium">{med.name}</TableCell>
                            <TableCell>{med.strength || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{categoryTranslation[med.category || ""] || med.category || "-"}</Badge>
                            </TableCell>
                            <TableCell className={status === "expired" ? "text-destructive font-semibold" : "text-amber-600 font-medium"}>
                              {new Date(expiryDate).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" })}
                            </TableCell>
                            <TableCell className="text-right">
                              {status === "expired" ? (
                                <Badge variant="destructive">หมดอายุแล้ว ({Math.abs(days)} วัน)</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-amber-700 border-amber-300">
                                  อีก {days} วัน
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{med.stock_quantity || 0} {med.unit}</TableCell>
                            <TableCell>
                              <Badge variant={med.is_active ? "default" : "secondary"}>
                                {med.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Medication Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) { setIsEditMode(false); setSelectedMedication(null); } }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "แก้ไขข้อมูลยา" : "เพิ่มรายการยาใหม่"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ชื่อยา *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="เช่น Fluoxetine 20mg" />
                </div>
                <div className="space-y-2">
                  <Label>ชื่อสามัญ</Label>
                  <Input value={formData.generic_name} onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })} placeholder="เช่น Fluoxetine" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>หมวดหมู่</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{categoryTranslation[cat] || cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ความแรง</Label>
                  <Input value={formData.strength} onChange={(e) => setFormData({ ...formData, strength: e.target.value })} placeholder="เช่น 20mg" />
                </div>
                <div className="space-y-2">
                  <Label>รูปแบบยา</Label>
                  <Select value={formData.dosage_form} onValueChange={(v) => setFormData({ ...formData, dosage_form: v })}>
                    <SelectTrigger><SelectValue placeholder="เลือกรูปแบบ" /></SelectTrigger>
                    <SelectContent>
                      {DOSAGE_FORMS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>หน่วย</Label>
                  <Input value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>ราคาทุน (บาท)</Label>
                  <Input type="number" min={0} step={0.01} value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>ราคาขาย (บาท)</Label>
                  <Input type="number" min={0} step={0.01} value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>จำนวนเริ่มต้น</Label>
                  <Input type="number" min={0} value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>แจ้งเตือนเมื่อ</Label>
                  <Input type="number" min={0} value={formData.min_stock} onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 10 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>วันหมดอายุ</Label>
                <DateInput
                  value={formData.expiry_date}
                  onChange={(val) => setFormData({ ...formData, expiry_date: val })}
                />
              </div>
              <div className="space-y-2">
                <Label>วิธีใช้</Label>
                <Textarea value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ข้อห้ามใช้</Label>
                  <Textarea value={formData.contraindications} onChange={(e) => setFormData({ ...formData, contraindications: e.target.value })} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>ผลข้างเคียง</Label>
                  <Textarea value={formData.side_effects} onChange={(e) => setFormData({ ...formData, side_effects: e.target.value })} rows={2} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setIsEditMode(false); setSelectedMedication(null); }}>ยกเลิก</Button>
              <Button onClick={handleSubmitMedication}>{isEditMode ? "บันทึก" : "เพิ่มยา"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Stock Dialog */}
        <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>เพิ่มสต็อกยา</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedMedication?.name}</p>
                <p className="text-sm text-muted-foreground">
                  คงเหลือปัจจุบัน: {selectedMedication?.stock_quantity || 0} {selectedMedication?.unit}
                </p>
              </div>
              <div className="space-y-2">
                <Label>จำนวนที่เพิ่ม ({selectedMedication?.unit})</Label>
                <Input
                  type="number"
                  min={1}
                  value={addStockQuantity}
                  onChange={(e) => setAddStockQuantity(parseInt(e.target.value) || 0)}
                  placeholder="ระบุจำนวนที่ต้องการเพิ่ม"
                />
              </div>
              {addStockQuantity > 0 && (
                <p className="text-sm text-muted-foreground">
                  หลังเพิ่ม: {(selectedMedication?.stock_quantity || 0) + addStockQuantity} {selectedMedication?.unit}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>ยกเลิก</Button>
              <Button onClick={handleAddStock} disabled={addStockQuantity <= 0}>เพิ่มสต็อก</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Update Price Dialog */}
        <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ปรับปรุงราคา</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedMedication?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedMedication?.strength}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ราคาทุน (บาท)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ราคาขาย (บาท)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              {newSellingPrice > 0 && newCostPrice > 0 && (
                <p className="text-sm text-muted-foreground">
                  กำไรต่อหน่วย: ฿{(newSellingPrice - newCostPrice).toFixed(2)} ({((newSellingPrice - newCostPrice) / newCostPrice * 100).toFixed(1)}%)
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPriceDialogOpen(false)}>ยกเลิก</Button>
              <Button onClick={handleUpdatePrice}>บันทึกราคา</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ยืนยันการยกเลิกใช้งาน</AlertDialogTitle>
              <AlertDialogDescription>
                ต้องการยกเลิกการใช้งานยา "{selectedMedication?.name}" หรือไม่?
                ยาจะถูกซ่อนจากรายการสั่งยาแต่ยังคงอยู่ในระบบ
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>ยืนยัน</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default InventoryManagement;
