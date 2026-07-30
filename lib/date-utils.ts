import type { AppTimestamp } from "@/types";

export function toDate(value: string | AppTimestamp | undefined | null): Date | null {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return value.toDate();
}

export function formatDateEsAr(value: string | AppTimestamp | undefined | null): string {
  const d = toDate(value);
  if (!d) return "-";
  return d.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

export function toBsAsIsoString(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return `${clean}T00:00:00-03:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(clean)) {
    return `${clean}-03:00`;
  }
  return new Date(clean).toISOString();
}
