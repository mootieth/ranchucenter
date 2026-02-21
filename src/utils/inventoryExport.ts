import type { Medication } from "@/hooks/useMedications";
import type { MedicationUsageItem } from "@/hooks/useMedicationUsageReport";
import type { StockMovementWithMedication } from "@/hooks/useStockMovements";
import sarabunFontUrl from "@/assets/fonts/Sarabun-Regular.ttf";

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

function getMedRows(medications: Medication[]) {
  return medications.map((med) => ({
    name: med.name,
    generic_name: med.generic_name || "-",
    category: categoryTranslation[med.category || ""] || med.category || "-",
    strength: med.strength || "-",
    dosage_form: med.dosage_form || "-",
    unit: med.unit || "เม็ด",
    cost_price: (med as any).cost_price ?? 0,
    price: med.price ?? 0,
    stock_quantity: med.stock_quantity ?? 0,
    min_stock: med.min_stock ?? 10,
    expiry_date: (med as any).expiry_date || "-",
    status: med.is_active ? "ใช้งาน" : "ไม่ใช้งาน",
  }));
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getCategoryLabel(categoryFilter: string): string {
  if (!categoryFilter || categoryFilter === "all") return "ทั้งหมด";
  return categoryTranslation[categoryFilter] || categoryFilter;
}

export function exportInventoryCSV(medications: Medication[], categoryFilter: string = "all") {
  const catLabel = getCategoryLabel(categoryFilter);
  const headers = [
    "ชื่อยา", "ชื่อสามัญ", "หมวดหมู่", "ความแรง", "รูปแบบ", "หน่วย",
    "ราคาทุน", "ราคาขาย", "คงเหลือ", "สต็อกขั้นต่ำ", "วันหมดอายุ", "สถานะ",
  ];
  const rows = getMedRows(medications);
  const csvContent = "\uFEFF" + [
    `รายงานคลังยา`,
    `หมวดยา: ${catLabel}`,
    `วันที่ออกรายงาน: ${new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`,
    "",
    headers.join(","),
    ...rows.map((r) =>
      [
        `"${r.name}"`, `"${r.generic_name}"`, `"${r.category}"`, `"${r.strength}"`,
        `"${r.dosage_form}"`, `"${r.unit}"`, r.cost_price, r.price,
        r.stock_quantity, r.min_stock, `"${r.expiry_date}"`, `"${r.status}"`,
      ].join(",")
    ),
  ].join("\n");

  downloadCSV(csvContent, `inventory_report_${new Date().toISOString().slice(0, 10)}.csv`);
}

async function loadSarabunFont(): Promise<string> {
  const response = await fetch(sarabunFontUrl);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function createThaiPDF(orientation: "landscape" | "portrait" = "landscape") {
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default;
  await import("jspdf-autotable");

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const fontBase64 = await loadSarabunFont();
  doc.addFileToVFS("Sarabun-Regular.ttf", fontBase64);
  doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
  doc.setFont("Sarabun");
  return doc;
}

export async function exportInventoryPDF(medications: Medication[], categoryFilter: string = "all") {
  const doc = await createThaiPDF("landscape");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;
  const catLabel = getCategoryLabel(categoryFilter);

  doc.setFontSize(18);
  doc.text("รายงานคลังยา", 14, 15);
  doc.setFontSize(10);
  doc.text(`หมวดยา: ${catLabel}`, 14, 22);
  doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`, 14, 28);

  const rows = getMedRows(medications);
  const tableData = rows.map((r) => [
    r.name, r.generic_name, r.category, r.strength,
    r.dosage_form, r.unit,
    r.cost_price.toFixed(2), r.price.toFixed(2),
    r.stock_quantity.toString(), r.min_stock.toString(),
    r.expiry_date, r.status,
  ]);

  autoTable(doc, {
    startY: 34,
    head: [[
      "ชื่อยา", "ชื่อสามัญ", "หมวดหมู่", "ความแรง", "รูปแบบ", "หน่วย",
      "ราคาทุน", "ราคาขาย", "คงเหลือ", "ขั้นต่ำ", "วันหมดอายุ", "สถานะ",
    ]],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 1.5, font: "Sarabun", fontStyle: "normal" },
    headStyles: { fillColor: [59, 130, 246], font: "Sarabun", fontStyle: "normal" },
  });

  const totalItems = medications.length;
  const totalValue = medications.reduce((s, m) => s + (m.price || 0) * (m.stock_quantity || 0), 0);
  const totalCost = medications.reduce((s, m) => s + ((m as any).cost_price || 0) * (m.stock_quantity || 0), 0);
  const lowStock = medications.filter((m) => (m.stock_quantity || 0) <= (m.min_stock || 10)).length;

  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  doc.setFontSize(9);
  doc.text(`รายการทั้งหมด: ${totalItems} | ยาใกล้หมด: ${lowStock} | มูลค่าคลัง (ราคาขาย): ฿${totalValue.toLocaleString()} | มูลค่าคลัง (ราคาทุน): ฿${totalCost.toLocaleString()}`, 14, finalY + 8);

  doc.save(`inventory_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ===== Usage Report Export =====

export function exportUsageReportCSV(data: MedicationUsageItem[], startDate: string, endDate: string) {
  const headers = ["#", "ชื่อยา", "จำนวนที่จ่าย", "หน่วย", "จำนวนใบสั่งยา", "เฉลี่ยต่อใบ"];
  const csvContent = "\uFEFF" + [
    "รายงานการใช้ยา",
    `ช่วงวันที่: ${startDate} ถึง ${endDate}`,
    `วันที่ออกรายงาน: ${new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`,
    "",
    headers.join(","),
    ...data.map((item, i) =>
      [
        i + 1,
        `"${item.medication_name}"`,
        item.total_quantity,
        `"${item.unit || "เม็ด"}"`,
        item.prescription_count,
        (item.total_quantity / item.prescription_count).toFixed(1),
      ].join(",")
    ),
  ].join("\n");

  downloadCSV(csvContent, `usage_report_${startDate}_${endDate}.csv`);
}

export async function exportUsageReportPDF(data: MedicationUsageItem[], startDate: string, endDate: string) {
  const doc = await createThaiPDF("portrait");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  doc.setFontSize(18);
  doc.text("รายงานการใช้ยา", 14, 15);
  doc.setFontSize(10);
  doc.text(`ช่วงวันที่: ${startDate} ถึง ${endDate}`, 14, 22);
  doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`, 14, 28);

  const tableData = data.map((item, i) => [
    (i + 1).toString(),
    item.medication_name,
    item.total_quantity.toLocaleString(),
    item.unit || "เม็ด",
    item.prescription_count.toString(),
    (item.total_quantity / item.prescription_count).toFixed(1),
  ]);

  autoTable(doc, {
    startY: 34,
    head: [["#", "ชื่อยา", "จำนวนที่จ่าย", "หน่วย", "จำนวนใบสั่งยา", "เฉลี่ยต่อใบ"]],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 2, font: "Sarabun", fontStyle: "normal" },
    headStyles: { fillColor: [59, 130, 246], font: "Sarabun", fontStyle: "normal" },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      2: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  const totalQty = data.reduce((s, i) => s + i.total_quantity, 0);
  const totalPresc = data.reduce((s, i) => s + i.prescription_count, 0);
  doc.setFontSize(9);
  doc.text(`รายการยาทั้งหมด: ${data.length} | จำนวนยาที่จ่ายทั้งหมด: ${totalQty.toLocaleString()} | จำนวนใบสั่งยา: ${totalPresc.toLocaleString()} ครั้ง`, 14, finalY + 8);

  doc.save(`usage_report_${startDate}_${endDate}.pdf`);
}

// ===== Stock Movements Export =====

const movementTypeLabel: Record<string, string> = {
  in: "รับเข้า",
  out: "จ่ายออก",
  adjust: "ปรับปรุง",
};

const referenceTypeLabel: Record<string, string> = {
  manual: "เพิ่มสต็อก",
  prescription: "จ่ายยา",
  initial: "เริ่มต้น",
};

export function exportMovementsCSV(data: StockMovementWithMedication[], startDate: string, endDate: string) {
  const headers = ["วันที่/เวลา", "ชื่อยา", "ประเภท", "จำนวน", "หน่วย", "ก่อนเปลี่ยน", "หลังเปลี่ยน", "อ้างอิง", "หมายเหตุ"];
  const csvContent = "\uFEFF" + [
    "ประวัติการเคลื่อนไหวสต็อก",
    `ช่วงวันที่: ${startDate} ถึง ${endDate}`,
    `วันที่ออกรายงาน: ${new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`,
    "",
    headers.join(","),
    ...data.map((mov) =>
      [
        `"${new Date(mov.created_at).toLocaleString("th-TH")}"`,
        `"${mov.medication_name}"`,
        `"${movementTypeLabel[mov.movement_type] || mov.movement_type}"`,
        mov.quantity,
        `"${mov.medication_unit}"`,
        mov.previous_stock,
        mov.new_stock,
        `"${referenceTypeLabel[mov.reference_type || ""] || mov.reference_type || "-"}"`,
        `"${(mov.notes || "-").replace(/"/g, '""')}"`,
      ].join(",")
    ),
  ].join("\n");

  downloadCSV(csvContent, `stock_movements_${startDate}_${endDate}.csv`);
}

export async function exportMovementsPDF(data: StockMovementWithMedication[], startDate: string, endDate: string) {
  const doc = await createThaiPDF("landscape");
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default;

  doc.setFontSize(18);
  doc.text("ประวัติการเคลื่อนไหวสต็อก", 14, 15);
  doc.setFontSize(10);
  doc.text(`ช่วงวันที่: ${startDate} ถึง ${endDate}`, 14, 22);
  doc.text(`วันที่ออกรายงาน: ${new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}`, 14, 28);

  const tableData = data.map((mov) => [
    new Date(mov.created_at).toLocaleString("th-TH", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    }),
    mov.medication_name,
    movementTypeLabel[mov.movement_type] || mov.movement_type,
    `${mov.movement_type === "in" ? "+" : mov.movement_type === "out" ? "-" : ""}${mov.quantity} ${mov.medication_unit}`,
    mov.previous_stock.toString(),
    mov.new_stock.toString(),
    referenceTypeLabel[mov.reference_type || ""] || mov.reference_type || "-",
    mov.notes || "-",
  ]);

  autoTable(doc, {
    startY: 34,
    head: [["วันที่/เวลา", "ชื่อยา", "ประเภท", "จำนวน", "ก่อนเปลี่ยน", "หลังเปลี่ยน", "อ้างอิง", "หมายเหตุ"]],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 1.5, font: "Sarabun", fontStyle: "normal" },
    headStyles: { fillColor: [59, 130, 246], font: "Sarabun", fontStyle: "normal" },
    columnStyles: {
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  const totalIn = data.filter((m) => m.movement_type === "in").reduce((s, m) => s + m.quantity, 0);
  const totalOut = data.filter((m) => m.movement_type === "out").reduce((s, m) => s + m.quantity, 0);
  doc.setFontSize(9);
  doc.text(`รายการทั้งหมด: ${data.length} | รับเข้ารวม: ${totalIn.toLocaleString()} | จ่ายออกรวม: ${totalOut.toLocaleString()}`, 14, finalY + 8);

  doc.save(`stock_movements_${startDate}_${endDate}.pdf`);
}
