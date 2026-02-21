import { useState } from "react";
import { Plus, Edit, Trash2, Search, ToggleLeft, ToggleRight, MapPin, Video, Building, CalendarIcon, X, Check, ChevronsUpDown } from "lucide-react";
import GoogleCalendarManagement from "@/components/settings/GoogleCalendarManagement";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useServices, useCreateService, useUpdateService, useDeleteService, Service } from "@/hooks/useServices";
import { useServiceLocations, useCreateServiceLocation, useUpdateServiceLocation, useDeleteServiceLocation, ServiceLocation } from "@/hooks/useServiceLocations";
import { useServiceCategories, useCreateServiceCategory, useDeleteServiceCategory } from "@/hooks/useServiceCategories";

const serviceModeLabels: Record<string, string> = {
  onsite: "นัดหมายเจอตัว",
  online: "นัดหมายออนไลน์",
};

const serviceModeIcons: Record<string, React.ReactNode> = {
  onsite: <Building className="w-3.5 h-3.5" />,
  online: <Video className="w-3.5 h-3.5" />,
};

const ServiceManagement = () => {
  const { data: services = [], isLoading } = useServices(true);
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const { data: locations = [], isLoading: isLoadingLocations } = useServiceLocations(true);
  const createLocation = useCreateServiceLocation();
  const updateLocation = useUpdateServiceLocation();
  const deleteLocation = useDeleteServiceLocation();

  const { data: categories = [] } = useServiceCategories();
  const createCategory = useCreateServiceCategory();
  const deleteCategory = useDeleteServiceCategory();
  const [newCategoryName, setNewCategoryName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  // Location form state
  const [isLocationFormOpen, setIsLocationFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ServiceLocation | null>(null);
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<ServiceLocation | null>(null);
  const [locationFormData, setLocationFormData] = useState({ name: "", address: "" });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    category: "",
    duration_minutes: "" as string | number,
    service_mode: "onsite",
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", price: 0, category: "", duration_minutes: "", service_mode: "onsite" });
    setEditingService(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      price: service.price,
      category: service.category || "",
      duration_minutes: service.duration_minutes ?? "",
      service_mode: service.service_mode || "onsite",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("กรุณาระบุชื่อบริการ");
      return;
    }
    if (formData.price < 0) {
      toast.error("ราคาต้องไม่ติดลบ");
      return;
    }

    try {
      const durationVal = formData.duration_minutes === "" ? null : Number(formData.duration_minutes);
      if (editingService) {
        await updateService.mutateAsync({
          id: editingService.id,
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          price: formData.price,
          category: formData.category.trim() || undefined,
          duration_minutes: durationVal,
          service_mode: formData.service_mode,
        });
        toast.success("แก้ไขบริการสำเร็จ");
      } else {
        await createService.mutateAsync({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          price: formData.price,
          category: formData.category.trim() || undefined,
          duration_minutes: durationVal,
          service_mode: formData.service_mode,
        });
        toast.success("เพิ่มบริการสำเร็จ");
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      await updateService.mutateAsync({ id: service.id, is_active: !service.is_active });
      toast.success(service.is_active ? "ปิดใช้งานบริการแล้ว" : "เปิดใช้งานบริการแล้ว");
    } catch (error: any) {
      toast.error(error?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteService.mutateAsync(deleteTarget.id);
      toast.success("ลบบริการสำเร็จ");
      setDeleteTarget(null);
    } catch (error: any) {
      toast.error(error?.message || "เกิดข้อผิดพลาดในการลบ");
    }
  };

  // Location handlers
  const resetLocationForm = () => {
    setLocationFormData({ name: "", address: "" });
    setEditingLocation(null);
  };

  const handleOpenCreateLocation = () => {
    resetLocationForm();
    setIsLocationFormOpen(true);
  };

  const handleOpenEditLocation = (loc: ServiceLocation) => {
    setEditingLocation(loc);
    setLocationFormData({ name: loc.name, address: loc.address || "" });
    setIsLocationFormOpen(true);
  };

  const handleSubmitLocation = async () => {
    if (!locationFormData.name.trim()) {
      toast.error("กรุณาระบุชื่อสถานที่");
      return;
    }
    try {
      if (editingLocation) {
        await updateLocation.mutateAsync({
          id: editingLocation.id,
          name: locationFormData.name.trim(),
          address: locationFormData.address.trim() || undefined,
        });
        toast.success("แก้ไขสถานที่สำเร็จ");
      } else {
        await createLocation.mutateAsync({
          name: locationFormData.name.trim(),
          address: locationFormData.address.trim() || undefined,
        });
        toast.success("เพิ่มสถานที่สำเร็จ");
      }
      setIsLocationFormOpen(false);
      resetLocationForm();
    } catch (error: any) {
      toast.error(error?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleToggleLocationActive = async (loc: ServiceLocation) => {
    try {
      await updateLocation.mutateAsync({ id: loc.id, is_active: !loc.is_active });
      toast.success(loc.is_active ? "ปิดใช้งานสถานที่แล้ว" : "เปิดใช้งานสถานที่แล้ว");
    } catch (error: any) {
      toast.error(error?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleDeleteLocationConfirm = async () => {
    if (!deleteLocationTarget) return;
    try {
      await deleteLocation.mutateAsync(deleteLocationTarget.id);
      toast.success("ลบสถานที่สำเร็จ");
      setDeleteLocationTarget(null);
    } catch (error: any) {
      toast.error(error?.message || "เกิดข้อผิดพลาดในการลบ");
    }
  };

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout title="ตั้งค่าบริการ">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ตั้งค่าบริการ</h1>
          <p className="text-muted-foreground">จัดการรายการบริการ ราคา และสถานที่ให้บริการ</p>
        </div>

        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services">รายการบริการ</TabsTrigger>
            <TabsTrigger value="locations">สถานที่ให้บริการ</TabsTrigger>
            <TabsTrigger value="google-calendar" className="gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" />
              Google Calendar
            </TabsTrigger>
          </TabsList>

          {/* ===== Services Tab ===== */}
          <TabsContent value="services" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="ค้นหาบริการ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleOpenCreate} className="gap-2">
                <Plus className="w-4 h-4" />
                เพิ่มบริการใหม่
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อบริการ</TableHead>
                    <TableHead>รายละเอียด</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>หมวดหมู่</TableHead>
                    <TableHead>ระยะเวลา</TableHead>
                    <TableHead className="text-right">ราคา (บาท)</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">กำลังโหลด...</TableCell>
                    </TableRow>
                  ) : filteredServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">ไม่พบรายการบริการ</TableCell>
                    </TableRow>
                  ) : (
                    filteredServices.map((service) => (
                      <TableRow key={service.id} className={!service.is_active ? "opacity-50" : ""}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {service.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {serviceModeIcons[service.service_mode] || serviceModeIcons.onsite}
                            {serviceModeLabels[service.service_mode] || service.service_mode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {service.category ? <Badge variant="secondary">{service.category}</Badge> : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {service.duration_minutes
                            ? service.duration_minutes >= 60
                              ? `${Math.floor(service.duration_minutes / 60)} ชม.${service.duration_minutes % 60 > 0 ? ` ${service.duration_minutes % 60} นาที` : ""}`
                              : `${service.duration_minutes} นาที`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {service.price.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={service.is_active ? "default" : "outline"}>
                            {service.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleToggleActive(service)} title={service.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}>
                              {service.is_active ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(service)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(service)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ===== Locations Tab ===== */}
          <TabsContent value="locations" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-muted-foreground">สถานที่ให้บริการสำหรับนัดหมายเจอตัว (Onsite)</p>
              <Button onClick={handleOpenCreateLocation} className="gap-2">
                <Plus className="w-4 h-4" />
                เพิ่มสถานที่
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อสถานที่</TableHead>
                    <TableHead>ที่อยู่</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="text-center">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingLocations ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">กำลังโหลด...</TableCell>
                    </TableRow>
                  ) : locations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        <MapPin className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                        ยังไม่มีสถานที่ให้บริการ
                      </TableCell>
                    </TableRow>
                  ) : (
                    locations.map((loc) => (
                      <TableRow key={loc.id} className={!loc.is_active ? "opacity-50" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {loc.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[300px] truncate">
                          {loc.address || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={loc.is_active ? "default" : "outline"}>
                            {loc.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleToggleLocationActive(loc)} title={loc.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}>
                              {loc.is_active ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditLocation(loc)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteLocationTarget(loc)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          {/* ===== Google Calendar Tab ===== */}
          <TabsContent value="google-calendar" className="space-y-4 mt-4">
            <GoogleCalendarManagement />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Service Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) { setIsFormOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingService ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อบริการ *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น ค่าปรึกษา, ค่าบำบัด"
              />
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="รายละเอียดเพิ่มเติม"
              />
            </div>
            <div className="space-y-2">
              <Label>ประเภทการบริการ *</Label>
              <Select value={formData.service_mode} onValueChange={(val) => setFormData({ ...formData, service_mode: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onsite">
                    <span className="flex items-center gap-2">
                      <Building className="w-4 h-4" /> นัดหมายเจอตัว
                    </span>
                  </SelectItem>
                  <SelectItem value="online">
                    <span className="flex items-center gap-2">
                      <Video className="w-4 h-4" /> นัดหมายออนไลน์
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>หมวดหมู่</Label>
              {/* Selected category as tag */}
              {formData.category && (
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="gap-1 pr-1 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
                    {formData.category}
                    <button
                      type="button"
                      className="ml-0.5 hover:text-destructive"
                      onClick={() => setFormData({ ...formData, category: "" })}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                </div>
              )}
              {/* Notion-style select with search + create inline */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-9 font-normal text-muted-foreground">
                    {formData.category ? "เปลี่ยนหมวดหมู่..." : "เลือกหมวดหมู่..."}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="ค้นหาหรือสร้างหมวดหมู่..." />
                    <CommandList>
                      <CommandEmpty>
                        <span className="text-muted-foreground text-sm">ไม่พบหมวดหมู่</span>
                      </CommandEmpty>
                      <CommandGroup>
                        {categories.map((cat) => (
                          <CommandItem
                            key={cat.id}
                            value={cat.name}
                            onSelect={() => setFormData({ ...formData, category: cat.name })}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Check className={cn("h-3.5 w-3.5", formData.category === cat.name ? "opacity-100" : "opacity-0")} />
                              <Badge variant="secondary" className="font-normal">
                                {cat.name}
                              </Badge>
                            </div>
                            <button
                              type="button"
                              className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await deleteCategory.mutateAsync(cat.id);
                                  if (formData.category === cat.name) setFormData({ ...formData, category: "" });
                                  toast.success(`ลบหมวดหมู่ "${cat.name}" แล้ว`);
                                } catch (err: any) {
                                  toast.error(err?.message || "ลบไม่สำเร็จ");
                                }
                              }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  {/* Inline create */}
                  <div className="border-t p-2 flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="เพิ่มหมวดหมู่ใหม่..."
                      className="h-7 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newCategoryName.trim()) {
                            createCategory.mutateAsync(newCategoryName.trim()).then(() => {
                              setFormData({ ...formData, category: newCategoryName.trim() });
                              setNewCategoryName("");
                              toast.success("เพิ่มหมวดหมู่แล้ว");
                            }).catch((err: any) => toast.error(err?.message || "เพิ่มไม่สำเร็จ"));
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={!newCategoryName.trim() || createCategory.isPending}
                      onClick={() => {
                        if (newCategoryName.trim()) {
                          createCategory.mutateAsync(newCategoryName.trim()).then(() => {
                            setFormData({ ...formData, category: newCategoryName.trim() });
                            setNewCategoryName("");
                            toast.success("เพิ่มหมวดหมู่แล้ว");
                          }).catch((err: any) => toast.error(err?.message || "เพิ่มไม่สำเร็จ"));
                        }
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>ราคา (บาท) *</Label>
              <Input
                type="number"
                min={0}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>ระยะเวลาให้บริการ (นาที)</Label>
              <Input
                type="number"
                min={0}
                step={15}
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value === "" ? "" : Number(e.target.value) })}
                placeholder="เช่น 30, 60, 90, 120"
              />
              {formData.duration_minutes !== "" && Number(formData.duration_minutes) > 0 && (
                <p className="text-xs text-muted-foreground">
                  = {Number(formData.duration_minutes) >= 60
                    ? `${Math.floor(Number(formData.duration_minutes) / 60)} ชั่วโมง${Number(formData.duration_minutes) % 60 > 0 ? ` ${Number(formData.duration_minutes) % 60} นาที` : ""}`
                    : `${formData.duration_minutes} นาที`}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setIsFormOpen(false); resetForm(); }}>ยกเลิก</Button>
              <Button onClick={handleSubmit} disabled={createService.isPending || updateService.isPending}>
                {editingService ? "บันทึกการแก้ไข" : "เพิ่มบริการ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Location Dialog */}
      <Dialog open={isLocationFormOpen} onOpenChange={(open) => { if (!open) { setIsLocationFormOpen(false); resetLocationForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLocation ? "แก้ไขสถานที่" : "เพิ่มสถานที่ใหม่"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อสถานที่ *</Label>
              <Input
                value={locationFormData.name}
                onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                placeholder="เช่น สาขาจตุจักร, ห้องปรึกษา A"
              />
            </div>
            <div className="space-y-2">
              <Label>ที่อยู่</Label>
              <Input
                value={locationFormData.address}
                onChange={(e) => setLocationFormData({ ...locationFormData, address: e.target.value })}
                placeholder="ที่อยู่เต็ม"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setIsLocationFormOpen(false); resetLocationForm(); }}>ยกเลิก</Button>
              <Button onClick={handleSubmitLocation} disabled={createLocation.isPending || updateLocation.isPending}>
                {editingLocation ? "บันทึกการแก้ไข" : "เพิ่มสถานที่"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Service Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบบริการ "{deleteTarget?.name}" หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Location Confirmation */}
      <AlertDialog open={!!deleteLocationTarget} onOpenChange={(open) => { if (!open) setDeleteLocationTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบสถานที่ "{deleteLocationTarget?.name}" หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLocationConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default ServiceManagement;
