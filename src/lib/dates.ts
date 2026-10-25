// Shows a date like "১৮ অক্টোবর, ২০২৬, ১০:৩০ AM" in Bangladesh time.
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("bn-BD", {
    timeZone: "Asia/Dhaka",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}