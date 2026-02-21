import { useState, useRef } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  Search,
  Plus,
  Receipt,
  Printer,
  Download,
  Eye,
  CreditCard,
  Banknote,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  useBillings,
  useBillingStats,
  useCreateBilling,
  useUpdateBillingStatus,
  Billing,
} from "@/hooks/useBillings";
import { usePatients } from "@/hooks/usePatients";

const statusStyles = {
  paid: {
    bg: "bg-green-100",
    text: "text-green-900",
    border: "border-green-300",
    icon: CheckCircle2,
    label: "ชำระแล้ว",
  },
  pending: {
    bg: "bg-amber-100",
    text: "text-amber-900",
    border: "border-amber-300",
    icon: Clock,
    label: "รอชำระ",
  },
  cancelled: {
    bg: "bg-red-100",
    text: "text-red-900",
    border: "border-red-300",
    icon: XCircle,
    label: "ยกเลิก",
  },
};

const paymentMethodLabels: Record<
  string,
  { icon: typeof Banknote; label: string }
> = {
  cash: { icon: Banknote, label: "เงินสด" },
  card: { icon: CreditCard, label: "บัตรเครดิต" },
  transfer: { icon: Receipt, label: "โอนเงิน" },
};

interface ServiceItem {
  description: string;
  price: number;
}

const CLINIC_INFO = {
  name: "Ranchu Center",
  subtitle: "คลินิกสุขภาพจิต",
  company: "บริษัท แทนปรางกรุ๊ป จำกัด เลขที่ผู้เสียภาษี 0105566165639",
  address: "646 ถนนเทศบาลนิมิตรเหนือ แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900",
  phone: "082-387-9955",
};

const generateReceiptHTML = (invoice: Billing) => {
  const patientName = invoice.patients
    ? `${invoice.patients.first_name} ${invoice.patients.last_name}`
    : "ไม่ทราบชื่อ";
  const patientHn = invoice.patients?.hn || "-";
  const statusKey = (invoice.payment_status ||
    "pending") as keyof typeof statusStyles;

  const itemsHTML = (invoice.billing_items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;">${item.description}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">฿${item.unit_price.toLocaleString()}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">฿${item.total.toLocaleString()}</td>
      </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบเสร็จรับเงิน - ${invoice.invoice_number}</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
    }
    body { font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 4px 0; font-size: 13px; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 14px; }
    .info-label { color: #888; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    .total-section { text-align: right; margin-top: 16px; padding-top: 12px; border-top: 2px solid #333; }
    .total-amount { font-size: 20px; font-weight: bold; }
    .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 16px; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; }
    .status-paid { background: #dcfce7; color: #166534; font-weight: 600; }
    .status-pending { background: #fef3c7; color: #92400e; font-weight: 600; }
    .status-cancelled { background: #fee2e2; color: #991b1b; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${CLINIC_INFO.name}</h1>
    <p>${CLINIC_INFO.subtitle}</p>
    <p>${CLINIC_INFO.address}</p>
    <p>โทร: ${CLINIC_INFO.phone}</p>
  </div>
  <h2 style="text-align:center;margin-bottom:20px;">ใบเสร็จรับเงิน</h2>
  <div class="info-grid">
    <div>
      <p class="info-label">เลขที่ใบเสร็จ</p>
      <p style="font-family:monospace;font-weight:600;">${invoice.invoice_number}</p>
    </div>
    <div style="text-align:right;">
      <p class="info-label">วันที่</p>
      <p>${format(new Date(invoice.billing_date), "d MMMM yyyy", { locale: th })}</p>
    </div>
    <div>
      <p class="info-label">ผู้ป่วย</p>
      <p style="font-weight:600;">${patientName}</p>
      <p style="font-size:12px;color:#888;">HN: ${patientHn}</p>
    </div>
    <div style="text-align:right;">
      <p class="info-label">สถานะ</p>
      <span class="status-badge status-${statusKey}">${statusStyles[statusKey]?.label || statusKey}</span>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>รายการ</th>
        <th style="text-align:center;">จำนวน</th>
        <th style="text-align:right;">ราคา/หน่วย</th>
        <th style="text-align:right;">รวม</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML || '<tr><td colspan="4" style="text-align:center;padding:16px;color:#888;">ไม่มีรายการ</td></tr>'}
    </tbody>
  </table>
  ${invoice.discount ? `<div style="text-align:right;font-size:14px;">ส่วนลด: ฿${(invoice.discount || 0).toLocaleString()}</div>` : ""}
  <div class="total-section">
    <span>รวมทั้งสิ้น: </span>
    <span class="total-amount">฿${invoice.total.toLocaleString()}</span>
  </div>
  ${invoice.payment_method ? `<div style="text-align:right;font-size:13px;color:#666;margin-top:8px;">ชำระโดย: ${paymentMethodLabels[invoice.payment_method]?.label || invoice.payment_method}</div>` : ""}
  <div class="footer">
    <p>ขอบคุณที่ใช้บริการ ${CLINIC_INFO.name}</p>
    <p>เอกสารนี้ออกโดยระบบอัตโนมัติ</p>
  </div>
</body>
</html>`;
};

const BillingPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Billing | null>(null);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [paymentDialogInvoice, setPaymentDialogInvoice] =
    useState<Billing | null>(null);
  const [dialogPaymentMethod, setDialogPaymentMethod] = useState<string>("");

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [services, setServices] = useState<ServiceItem[]>([
    { description: "", price: 0 },
  ]);

  const { data: billings = [], isLoading } = useBillings();
  const { data: stats } = useBillingStats();
  const { data: patients = [] } = usePatients();
  const createBilling = useCreateBilling();
  const updateBillingStatus = useUpdateBillingStatus();

  const filteredInvoices = billings.filter((invoice) => {
    const patientName = invoice.patients
      ? `${invoice.patients.first_name} ${invoice.patients.last_name}`
      : "";
    const patientHn = invoice.patients?.hn || "";
    const patientPhone = invoice.patients?.phone || "";
    const patientIdCard = invoice.patients?.id_card || "";

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      patientName.toLowerCase().includes(q) ||
      invoice.invoice_number.toLowerCase().includes(q) ||
      patientHn.toLowerCase().includes(q) ||
      patientPhone.includes(searchQuery) ||
      patientIdCard.includes(searchQuery);
    const matchesStatus =
      statusFilter === "all" || invoice.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const addServiceRow = () => {
    setServices([...services, { description: "", price: 0 }]);
  };

  const removeServiceRow = (index: number) => {
    if (services.length > 1) {
      setServices(services.filter((_, i) => i !== index));
    }
  };

  const updateService = (
    index: number,
    field: keyof ServiceItem,
    value: string | number,
  ) => {
    const updated = [...services];
    if (field === "price") {
      updated[index][field] = Number(value) || 0;
    } else {
      updated[index][field] = value as string;
    }
    setServices(updated);
  };

  const calculateTotal = () => {
    return services.reduce((sum, item) => sum + (item.price || 0), 0);
  };

  const handleSubmit = () => {
    if (
      !selectedPatient ||
      services.filter((s) => s.description && s.price > 0).length === 0
    ) {
      return;
    }

    const validServices = services.filter((s) => s.description && s.price > 0);
    const total = calculateTotal();

    createBilling.mutate(
      {
        billing: {
          patient_id: selectedPatient,
          subtotal: total,
          total: total,
          payment_method: paymentMethod || null,
          payment_status: paymentMethod ? "paid" : "pending",
        },
        items: validServices.map((s) => ({
          description: s.description,
          item_type: "treatment",
          unit_price: s.price,
          total: s.price,
        })),
      },
      {
        onSuccess: () => {
          setIsNewInvoiceOpen(false);
          setSelectedPatient("");
          setPaymentMethod("");
          setServices([{ description: "", price: 0 }]);
        },
      },
    );
  };

  const handlePrint = (invoice: Billing) => {
    const html = generateReceiptHTML(invoice);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleDownload = (invoice: Billing) => {
    const html = generateReceiptHTML(invoice);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${invoice.invoice_number}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmPayment = () => {
    if (!paymentDialogInvoice || !dialogPaymentMethod) return;
    updateBillingStatus.mutate(
      {
        id: paymentDialogInvoice.id,
        payment_status: "paid",
        payment_method: dialogPaymentMethod,
        paid_amount: paymentDialogInvoice.total,
      },
      {
        onSuccess: () => {
          setPaymentDialogInvoice(null);
          setDialogPaymentMethod("");
          // Refresh selected invoice if it's the same one
          if (selectedInvoice?.id === paymentDialogInvoice.id) {
            setSelectedInvoice((prev) =>
              prev
                ? {
                    ...prev,
                    payment_status: "paid",
                    payment_method: dialogPaymentMethod,
                  }
                : null,
            );
          }
        },
      },
    );
  };

  return (
    <MainLayout title="ออกใบเสร็จ">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">รายได้วันนี้</p>
                <p className="text-2xl font-bold text-success">
                  ฿{(stats?.totalRevenue || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">รอชำระวันนี้</p>
                <p className="text-2xl font-bold text-warning">
                  ฿{(stats?.pendingAmount || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ใบเสร็จวันนี้</p>
                <p className="text-2xl font-bold">{stats?.invoiceCount || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary" />
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
            placeholder="ค้นหาเลขใบเสร็จ, ชื่อ, HN, เบอร์โทร, เลขบัตรประชาชน..."
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
            <SelectItem value="paid">ชำระแล้ว</SelectItem>
            <SelectItem value="pending">รอชำระ</SelectItem>
            <SelectItem value="cancelled">ยกเลิก</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              สร้างใบเสร็จ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>สร้างใบเสร็จใหม่</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>ผู้ป่วย</Label>
                <Select
                  value={selectedPatient}
                  onValueChange={setSelectedPatient}
                >
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
              <div className="space-y-2">
                <Label>รายการบริการ</Label>
                <div className="space-y-2">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="รายการ"
                        className="flex-1"
                        value={service.description}
                        onChange={(e) =>
                          updateService(index, "description", e.target.value)
                        }
                      />

                      <Input
                        placeholder="ราคา"
                        className="w-24"
                        type="number"
                        value={service.price || ""}
                        onChange={(e) =>
                          updateService(index, "price", e.target.value)
                        }
                      />

                      {services.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeServiceRow(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addServiceRow}>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มรายการ
                  </Button>
                </div>
                <div className="text-right pt-2">
                  <span className="text-sm text-muted-foreground">รวม: </span>
                  <span className="font-bold text-lg">
                    ฿{calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>วิธีชำระเงิน</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวิธีชำระ (หรือปล่อยว่างหากยังไม่ชำระ)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">เงินสด</SelectItem>
                    <SelectItem value="card">บัตรเครดิต</SelectItem>
                    <SelectItem value="transfer">โอนเงิน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsNewInvoiceOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  className="bg-gradient-primary"
                  onClick={handleSubmit}
                  disabled={
                    createBilling.isPending ||
                    !selectedPatient ||
                    services.filter((s) => s.description && s.price > 0)
                      .length === 0
                  }
                >
                  {createBilling.isPending ? (
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

      {/* Invoices Table */}
      <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">เลขใบเสร็จ</TableHead>
                <TableHead className="font-semibold">ผู้ป่วย</TableHead>
                <TableHead className="font-semibold">วันที่</TableHead>
                <TableHead className="font-semibold">ยอดเงิน</TableHead>
                <TableHead className="font-semibold">ชำระโดย</TableHead>
                <TableHead className="font-semibold">สถานะ</TableHead>
                <TableHead className="font-semibold w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-10 text-muted-foreground"
                  >
                    ไม่พบใบเสร็จ
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const patientName = invoice.patients
                    ? `${invoice.patients.first_name} ${invoice.patients.last_name}`
                    : "ไม่ทราบชื่อ";
                  const patientHn = invoice.patients?.hn || "-";
                  const statusKey = (invoice.payment_status ||
                    "pending") as keyof typeof statusStyles;
                  const StatusIcon = statusStyles[statusKey]?.icon || Clock;
                  const paymentMethodKey = invoice.payment_method || "cash";
                  const PaymentIcon =
                    paymentMethodLabels[paymentMethodKey]?.icon || Banknote;

                  return (
                    <TableRow
                      key={invoice.id}
                      className="table-row-hover cursor-pointer"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <TableCell>
                        <span className="font-mono text-sm font-medium">
                          {invoice.invoice_number}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {patientHn}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {format(
                            new Date(invoice.billing_date),
                            "d MMM yyyy",
                            { locale: th },
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          ฿{invoice.total.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {invoice.payment_method ? (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <PaymentIcon className="w-4 h-4" />
                            {paymentMethodLabels[paymentMethodKey]?.label ||
                              paymentMethodKey}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            statusStyles[statusKey]?.bg,
                            statusStyles[statusKey]?.text,
                            statusStyles[statusKey]?.border,
                          )}
                        >
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusStyles[statusKey]?.label || statusKey}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handlePrint(invoice)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(invoice)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invoice Detail Dialog */}
      <Dialog
        open={!!selectedInvoice}
        onOpenChange={() => setSelectedInvoice(null)}
      >
        <DialogContent className="max-w-lg">
          {selectedInvoice &&
            (() => {
              const patientName = selectedInvoice.patients
                ? `${selectedInvoice.patients.first_name} ${selectedInvoice.patients.last_name}`
                : "ไม่ทราบชื่อ";
              const patientHn = selectedInvoice.patients?.hn || "-";
              const statusKey = (selectedInvoice.payment_status ||
                "pending") as keyof typeof statusStyles;
              const isPending = selectedInvoice.payment_status === "pending";

              // Group items by type
              const serviceItems = (selectedInvoice.billing_items || []).filter(
                (i) =>
                  i.item_type === "treatment" ||
                  i.item_type === "consultation" ||
                  i.item_type === "procedure",
              );
              const medicationItems = (
                selectedInvoice.billing_items || []
              ).filter((i) => i.item_type === "medication");
              const otherItems = (selectedInvoice.billing_items || []).filter(
                (i) =>
                  ![
                    "treatment",
                    "consultation",
                    "procedure",
                    "medication",
                  ].includes(i.item_type),
              );

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      <span>ใบเสร็จรับเงิน</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-2 mr-12",
                          statusStyles[statusKey]?.bg,
                          statusStyles[statusKey]?.text,
                          "border-current",
                        )}
                      >
                        {statusStyles[statusKey]?.label}
                      </Badge>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Header */}
                    <div className="text-center py-4 border-b">
                      <h3 className="font-bold text-lg">{CLINIC_INFO.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {CLINIC_INFO.subtitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {CLINIC_INFO.address}
                      </p>
                    </div>

                    {/* Invoice Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">เลขที่ใบเสร็จ</p>
                        <p className="font-mono font-medium">
                          {selectedInvoice.invoice_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">วันที่</p>
                        <p className="font-medium">
                          {format(
                            new Date(selectedInvoice.billing_date),
                            "d MMM yyyy",
                            { locale: th },
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-sm">
                      <p className="text-muted-foreground">ผู้ป่วย</p>
                      <p className="font-medium">{patientName}</p>
                      <p className="text-muted-foreground text-xs">
                        HN: {patientHn}
                      </p>
                    </div>

                    <Separator />

                    {/* Service Items */}
                    {serviceItems.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium text-sm flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-primary" />
                          ค่าบริการ
                        </p>
                        {serviceItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm pl-6"
                          >
                            <span>{item.description}</span>
                            <span className="font-medium">
                              ฿{item.total.toLocaleString()}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm pl-6 pt-1 border-t border-dashed">
                          <span className="text-muted-foreground">
                            รวมค่าบริการ
                          </span>
                          <span className="font-semibold">
                            ฿
                            {serviceItems
                              .reduce((s, i) => s + i.total, 0)
                              .toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Medication Items */}
                    {medicationItems.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium text-sm flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-primary" />
                          ค่ายา
                        </p>
                        {medicationItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm pl-6"
                          >
                            <div>
                              <span>{item.description}</span>
                              {item.quantity > 1 && (
                                <span className="text-muted-foreground text-xs ml-2">
                                  ({item.quantity} x ฿
                                  {item.unit_price.toLocaleString()})
                                </span>
                              )}
                            </div>
                            <span className="font-medium">
                              ฿{item.total.toLocaleString()}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm pl-6 pt-1 border-t border-dashed">
                          <span className="text-muted-foreground">
                            รวมค่ายา
                          </span>
                          <span className="font-semibold">
                            ฿
                            {medicationItems
                              .reduce((s, i) => s + i.total, 0)
                              .toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Other Items */}
                    {otherItems.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium text-sm">รายการอื่นๆ</p>
                        {otherItems.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm pl-6"
                          >
                            <span>{item.description}</span>
                            <span className="font-medium">
                              ฿{item.total.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Show message if no items */}
                    {(selectedInvoice.billing_items || []).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        ไม่มีรายการ
                      </p>
                    )}

                    <Separator />

                    {/* Discount */}
                    {selectedInvoice.discount != null &&
                      selectedInvoice.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">ส่วนลด</span>
                          <span className="text-destructive">
                            -฿{selectedInvoice.discount.toLocaleString()}
                          </span>
                        </div>
                      )}

                    {/* Total */}
                    <div className="flex justify-between items-center bg-muted/30 rounded-lg p-3">
                      <span className="font-semibold">รวมทั้งสิ้น</span>
                      <span className="text-xl font-bold text-primary">
                        ฿{selectedInvoice.total.toLocaleString()}
                      </span>
                    </div>

                    {/* Payment info */}
                    {selectedInvoice.payment_method && (
                      <div className="text-sm text-muted-foreground text-center">
                        ชำระโดย:{" "}
                        {paymentMethodLabels[selectedInvoice.payment_method]
                          ?.label || selectedInvoice.payment_method}
                        {selectedInvoice.paid_at && (
                          <span className="ml-2">
                            เมื่อ{" "}
                            {format(
                              new Date(selectedInvoice.paid_at),
                              "d MMM yyyy HH:mm",
                              { locale: th },
                            )}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                      {isPending && (
                        <Button
                          className="flex-1 bg-gradient-primary hover:opacity-90"
                          onClick={() => {
                            setPaymentDialogInvoice(selectedInvoice);
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          รับชำระเงิน
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handlePrint(selectedInvoice)}
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        พิมพ์
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDownload(selectedInvoice)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        ดาวน์โหลด
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Dialog */}
      <Dialog
        open={!!paymentDialogInvoice}
        onOpenChange={() => {
          setPaymentDialogInvoice(null);
          setDialogPaymentMethod("");
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>รับชำระเงิน</DialogTitle>
          </DialogHeader>
          {paymentDialogInvoice && (
            <div className="space-y-4 pt-2">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">ยอดที่ต้องชำระ</p>
                <p className="text-2xl font-bold text-primary">
                  ฿{paymentDialogInvoice.total.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label>วิธีชำระเงิน</Label>
                <Select
                  value={dialogPaymentMethod}
                  onValueChange={setDialogPaymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกวิธีชำระเงิน" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">เงินสด</SelectItem>
                    <SelectItem value="card">บัตรเครดิต</SelectItem>
                    <SelectItem value="transfer">โอนเงิน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setPaymentDialogInvoice(null);
                    setDialogPaymentMethod("");
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                  disabled={
                    !dialogPaymentMethod || updateBillingStatus.isPending
                  }
                  onClick={handleConfirmPayment}
                >
                  {updateBillingStatus.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      ยืนยันชำระเงิน
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default BillingPage;
