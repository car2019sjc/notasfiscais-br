export function robustParseDate(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function dateToNumber(date: Date | null): number | null {
  if (!date) return null;
  return parseInt(date.toISOString().slice(0, 10).replace(/-/g, ''), 10);
}