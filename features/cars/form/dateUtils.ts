export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromIsoToDateInputValue(value?: string) {
  if (!value) return toDateInputValue(new Date());
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return toDateInputValue(new Date());
  return toDateInputValue(parsed);
}

export function toStartOfDayIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).toISOString();
}

export function toEndOfDayIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59)).toISOString();
}

export function randomToken(prefix: string) {
  const random = `${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
  return `${prefix}-${random}`;
}
