/** The form fields features ask most, written once (featKit.ts Ask). */
import { L } from "./kit.js";
import type { Ask } from "./featKit.js";

export const A = {
  name: (required = true): Ask => ({ id: "name", kind: "text", label: L("الاسم", "Name", "שם"), required }),
  phone: (required = true): Ask => ({ id: "phone", kind: "phone", label: L("التلفون", "Phone", "טלפון"), required }),
  email: (required = true): Ask => ({ id: "email", kind: "email", label: L("الإيميل", "Email", "מייל"), required }),
  details: (required = true, label = L("التفاصيل", "Details", "פרטים")): Ask => ({ id: "details", kind: "long", label, required }),
  orderId: (required = true): Ask => ({ id: "orderId", kind: "text", label: L("رقم الطلب", "Order number", "מספר הזמנה"), required }),
  product: (required = true): Ask => ({ id: "product", kind: "text", label: L("المنتج", "Product", "מוצר"), required }),
  date: (id = "day", label = L("اليوم", "Day", "יום"), required = true): Ask => ({ id, kind: "date", label, required }),
  number: (id: string, label: ReturnType<typeof L>, min?: number, max?: number, required = false): Ask => ({ id, kind: "number", label, required, ...(min !== undefined ? { min } : {}), ...(max !== undefined ? { max } : {}) }),
  text: (id: string, label: ReturnType<typeof L>, required = false): Ask => ({ id, kind: "text", label, required }),
  long: (id: string, label: ReturnType<typeof L>, required = false): Ask => ({ id, kind: "long", label, required }),
  pick: (id: string, label: ReturnType<typeof L>, options: Array<[string, ReturnType<typeof L>]>, required = true): Ask => ({ id, kind: "select", label, options, required }),
  check: (id: string, label: ReturnType<typeof L>): Ask => ({ id, kind: "check", label }),
};

/** States most requests move through. */
export const STATES = {
  request: [["new", L("جديد", "New", "חדש")], ["working", L("عم نشتغل عليه", "In progress", "בטיפול")], ["done", L("خلص", "Done", "הושלם")], ["declined", L("مرفوض", "Declined", "נדחה")]] as Array<[string, ReturnType<typeof L>]>,
  approval: [["waiting", L("ناطر الموافقة", "Waiting for approval", "ממתין לאישור")], ["approved", L("موافق عليه", "Approved", "אושר")], ["declined", L("مرفوض", "Declined", "נדחה")]] as Array<[string, ReturnType<typeof L>]>,
  booking: [["requested", L("طلب حجز", "Requested", "התבקש")], ["confirmed", L("مأكّد", "Confirmed", "אושר")], ["done", L("صار", "Done", "התקיים")], ["cancelled", L("ملغي", "Cancelled", "בוטל")]] as Array<[string, ReturnType<typeof L>]>,
};
