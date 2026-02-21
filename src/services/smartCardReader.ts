// Smart Card Reader Middleware Service
// Connects to a local middleware (e.g., ThaiD Reader) running on localhost
// to read Thai national ID card data via a smart card reader.

const DEFAULT_MIDDLEWARE_URL = "http://localhost:9898";

export interface SmartCardData {
  cid: string; // เลขบัตรประชาชน 13 หลัก
  prefix: string; // คำนำหน้า
  firstName: string;
  lastName: string;
  firstNameEn?: string;
  lastNameEn?: string;
  birthDate?: string; // YYYY-MM-DD
  gender?: string;
  address?: string;
  houseNumber?: string;
  moo?: string;
  street?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  photo?: string; // base64 encoded JPEG
  issueDate?: string;
  expireDate?: string;
}

interface MiddlewareResponse {
  success: boolean;
  data?: SmartCardData;
  error?: string;
}

// Map Thai prefix from card to form values
const mapPrefix = (prefix: string): string => {
  const prefixMap: Record<string, string> = {
    "นาย": "นาย",
    "นาง": "นาง",
    "นางสาว": "นางสาว",
    "เด็กชาย": "เด็กชาย",
    "เด็กหญิง": "เด็กหญิง",
    "Mr.": "Mr.",
    "Mrs.": "Mrs.",
    "Ms.": "Ms.",
    "Miss": "Miss",
  };
  return prefixMap[prefix] || prefix;
};

// Map gender from card
const mapGender = (gender: string): string => {
  const g = gender.toLowerCase();
  if (g === "male" || g === "ชาย" || g === "1") return "male";
  if (g === "female" || g === "หญิง" || g === "2") return "female";
  return "other";
};

// Convert Thai Buddhist year date (e.g., 25361231) to YYYY-MM-DD
const parseThaiDate = (dateStr: string): string => {
  if (!dateStr) return "";
  // Remove any separators
  const clean = dateStr.replace(/[^0-9]/g, "");
  if (clean.length === 8) {
    const year = parseInt(clean.substring(0, 4));
    const month = clean.substring(4, 6);
    const day = clean.substring(6, 8);
    // Convert Buddhist year to Christian year
    const ceYear = year > 2400 ? year - 543 : year;
    return `${ceYear}-${month}-${day}`;
  }
  return dateStr;
};

export const getMiddlewareUrl = (): string => {
  return localStorage.getItem("smartcard_middleware_url") || DEFAULT_MIDDLEWARE_URL;
};

export const setMiddlewareUrl = (url: string): void => {
  localStorage.setItem("smartcard_middleware_url", url);
};

export const readSmartCard = async (): Promise<SmartCardData> => {
  const baseUrl = getMiddlewareUrl();

  try {
    const response = await fetch(`${baseUrl}/read`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Middleware responded with status ${response.status}`);
    }

    const result: MiddlewareResponse = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || "ไม่สามารถอ่านข้อมูลจากบัตรได้");
    }

    // Normalize data
    const data = result.data;
    return {
      ...data,
      prefix: mapPrefix(data.prefix),
      gender: data.gender ? mapGender(data.gender) : undefined,
      birthDate: data.birthDate ? parseThaiDate(data.birthDate) : undefined,
    };
  } catch (error: any) {
    if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
      throw new Error(
        "ไม่สามารถเชื่อมต่อกับเครื่องอ่านบัตรได้ กรุณาตรวจสอบว่า:\n" +
        "1. โปรแกรมอ่านบัตร (Middleware) กำลังทำงานอยู่\n" +
        "2. เครื่องอ่านบัตร Smart Card เสียบอยู่\n" +
        `3. URL ถูกต้อง: ${baseUrl}`
      );
    }
    throw error;
  }
};

export const checkMiddlewareStatus = async (): Promise<boolean> => {
  const baseUrl = getMiddlewareUrl();
  try {
    const response = await fetch(`${baseUrl}/status`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
};
