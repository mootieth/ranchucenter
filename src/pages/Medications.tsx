import { useState } from "react";
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
  DialogTrigger,
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
} from "lucide-react";
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
  "Tablet",
  "Capsule",
  "Softgel",
  "Syrup",
  "Injection",
  "Cream",
  "Ointment",
  "Drops",
  "Patch",
  "Inhaler",
];

const CATEGORIES = [
  "Antidepressant",
  "Anxiolytic",
  "Antipsychotic",
  "Mood Stabilizer",
  "Hypnotic",
  "ADHD",
  "Beta-blocker",
  "Antihistamine",
  "Supplement",
  "Other",
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

const Medications = () => {
  const pageTitle = "จัดการยา";
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [stockQuantity, setStockQuantity] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    generic_name: "",
    category: "",
    strength: "",
    dosage_form: "",
    unit: "เม็ด",
    instructions: "",
    price: 0,
    stock_quantity: 0,
    min_stock: 10,
    contraindications: "",
    side_effects: "",
    is_active: true,
  });

  const { data: medications, isLoading } = useMedications(searchQuery, categoryFilter, !showInactive);
  const { data: categories } = useMedicationCategories();
  const { data: stats } = useMedicationStats();
  const createMutation = useCreateMedication();
  const updateMutation = useUpdateMedication();
  const deleteMutation = useDeleteMedication();
  const updateStockMutation = useUpdateStock();

  const resetForm = () => {
    setFormData({
      name: "",
      generic_name: "",
      category: "",
      strength: "",
      dosage_form: "",
      unit: "เม็ด",
      instructions: "",
      price: 0,
      stock_quantity: 0,
      min_stock: 10,
      contraindications: "",
      side_effects: "",
      is_active: true,
    });
    setSelectedMedication(null);
  };

  const handleOpenDialog = (medication?: Medication) => {
    if (medication) {
      setSelectedMedication(medication);
      setFormData({
        name: medication.name,
        generic_name: medication.generic_name || "",
        category: medication.category || "",
        strength: medication.strength || "",
        dosage_form: medication.dosage_form || "",
        unit: medication.unit || "เม็ด",
        instructions: medication.instructions || "",
        price: medication.price || 0,
        stock_quantity: medication.stock_quantity || 0,
        min_stock: medication.min_stock || 10,
        contraindications: medication.contraindications || "",
        side_effects: medication.side_effects || "",
        is_active: medication.is_active ?? true,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({
        title: "กรุณากรอกชื่อยา",
        variant: "destructive",
      });
      return;
    }

    try {
      if (selectedMedication) {
        await updateMutation.mutateAsync({
          id: selectedMedication.id,
          ...formData,
        });
        toast({
          title: "บันทึกข้อมูลยาเรียบร้อย",
        });
      } else {
        await createMutation.mutateAsync(formData);
        toast({
          title: "เพิ่มยาใหม่เรียบร้อย",
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedMedication) return;

    try {
      await deleteMutation.mutateAsync(selectedMedication.id);
      toast({
        title: "ยกเลิกการใช้งานยาเรียบร้อย",
      });
      setDeleteDialogOpen(false);
      setSelectedMedication(null);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const handleOpenStockDialog = (medication: Medication) => {
    setSelectedMedication(medication);
    setStockQuantity(medication.stock_quantity || 0);
    setIsStockDialogOpen(true);
  };

  const handleUpdateStock = async () => {
    if (!selectedMedication) return;

    try {
      await updateStockMutation.mutateAsync({
        id: selectedMedication.id,
        quantity: stockQuantity,
      });
      toast({
        title: "อัปเดตจำนวนคงเหลือเรียบร้อย",
      });
      setIsStockDialogOpen(false);
      setSelectedMedication(null);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const isLowStock = (med: Medication) =>
    (med.stock_quantity || 0) <= (med.min_stock || 10);

  return (
    <MainLayout title={pageTitle}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">จัดการยา</h1>
            <p className="text-muted-foreground">
              จัดการรายการยาและคลังยาในคลินิก
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มยาใหม่
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
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
              <div className="text-2xl font-bold text-primary">
                {stats?.activeMedications || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ยาใกล้หมด</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats?.lowStock || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">หมวดหมู่</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(stats?.categoryCount || {}).length}
              </div>
            </CardContent>
          </Card>
        </div>

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
                <Switch
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Label>แสดงยาที่ไม่ใช้งาน</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medications Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อยา</TableHead>
                  <TableHead>ชื่อสามัญ</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead>ความแรง</TableHead>
                  <TableHead>รูปแบบ</TableHead>
                  <TableHead className="text-right">ราคา</TableHead>
                  <TableHead className="text-right">คงเหลือ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      กำลังโหลด...
                    </TableCell>
                  </TableRow>
                ) : medications?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      ไม่พบรายการยา
                    </TableCell>
                  </TableRow>
                ) : (
                  medications?.map((med) => (
                    <TableRow key={med.id}>
                      <TableCell className="font-medium">{med.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {med.generic_name || "-"}
                      </TableCell>
                      <TableCell>
                        {med.category && (
                          <Badge variant="outline">
                            {categoryTranslation[med.category] || med.category}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{med.strength || "-"}</TableCell>
                      <TableCell>{med.dosage_form || "-"}</TableCell>
                      <TableCell className="text-right">
                        ฿{(med.price || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenStockDialog(med)}
                          className={isLowStock(med) ? "text-destructive" : ""}
                        >
                          {med.stock_quantity || 0} {med.unit}
                          {isLowStock(med) && (
                            <AlertTriangle className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={med.is_active ? "default" : "secondary"}>
                          {med.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(med)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedMedication(med);
                              setDeleteDialogOpen(true);
                            }}
                          >
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

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedMedication ? "แก้ไขข้อมูลยา" : "เพิ่มยาใหม่"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ชื่อยา *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="เช่น Fluoxetine 20mg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ชื่อสามัญ</Label>
                  <Input
                    value={formData.generic_name}
                    onChange={(e) =>
                      setFormData({ ...formData, generic_name: e.target.value })
                    }
                    placeholder="เช่น Fluoxetine"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>หมวดหมู่</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกหมวดหมู่" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryTranslation[cat] || cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ความแรง</Label>
                  <Input
                    value={formData.strength}
                    onChange={(e) =>
                      setFormData({ ...formData, strength: e.target.value })
                    }
                    placeholder="เช่น 20mg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>รูปแบบยา</Label>
                  <Select
                    value={formData.dosage_form}
                    onValueChange={(value) =>
                      setFormData({ ...formData, dosage_form: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกรูปแบบ" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOSAGE_FORMS.map((form) => (
                        <SelectItem key={form} value={form}>
                          {form}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>หน่วย</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    placeholder="เช่น เม็ด"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ราคา (บาท)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>จำนวนคงเหลือ</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock_quantity: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>แจ้งเตือนเมื่อ</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.min_stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_stock: parseInt(e.target.value) || 10,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>วิธีใช้</Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) =>
                    setFormData({ ...formData, instructions: e.target.value })
                  }
                  placeholder="รับประทานวันละ 1 ครั้ง หลังอาหารเช้า"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>ข้อห้ามใช้</Label>
                <Textarea
                  value={formData.contraindications}
                  onChange={(e) =>
                    setFormData({ ...formData, contraindications: e.target.value })
                  }
                  placeholder="ห้ามใช้ในผู้ป่วยที่แพ้ยากลุ่ม..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>ผลข้างเคียง</Label>
                <Textarea
                  value={formData.side_effects}
                  onChange={(e) =>
                    setFormData({ ...formData, side_effects: e.target.value })
                  }
                  placeholder="คลื่นไส้, ง่วงซึม, ปากแห้ง..."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label>เปิดใช้งานยานี้</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSubmit}>
                {selectedMedication ? "บันทึก" : "เพิ่มยา"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stock Update Dialog */}
        <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>อัปเดตจำนวนคงเหลือ</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                {selectedMedication?.name}
              </p>
              <div className="space-y-2">
                <Label>จำนวนคงเหลือ ({selectedMedication?.unit})</Label>
                <Input
                  type="number"
                  min={0}
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleUpdateStock}>บันทึก</Button>
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
              <AlertDialogAction onClick={handleDelete}>
                ยืนยัน
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Medications;
