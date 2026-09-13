export function calendarDateInTimeZone(instant: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

export function addCalendarDays(dateStr: string, days: number): string {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = String(next.getUTCFullYear()).padStart(4, '0');
  const nextMonth = String(next.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(next.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function isoWeekRange(dateStr: string): { startDate: string; endDate: string } {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12));
  const dayOfWeek = utcNoon.getUTCDay();
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startDate = addCalendarDays(dateStr, offsetToMonday);
  return { startDate, endDate: addCalendarDays(startDate, 6) };
}

export type ReportRangePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'custom';

export function reportRangeForPreset(
  preset: ReportRangePreset,
  timeZone: string,
  now = new Date(),
  custom?: { startDate: string; endDate: string },
): { startDate: string; endDate: string } {
  const today = calendarDateInTimeZone(now, timeZone);
  if (preset === 'today') {
    return { startDate: today, endDate: today };
  }
  if (preset === 'yesterday') {
    const yesterday = addCalendarDays(today, -1);
    return { startDate: yesterday, endDate: yesterday };
  }
  if (preset === 'this_week') {
    return isoWeekRange(today);
  }
  if (preset === 'last_week') {
    const thisWeek = isoWeekRange(today);
    const endDate = addCalendarDays(thisWeek.startDate, -1);
    return { startDate: addCalendarDays(endDate, -6), endDate };
  }
  return {
    startDate: custom?.startDate ?? today,
    endDate: custom?.endDate ?? today,
  };
}

export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  return date.toISOString();
}

export function formatConsumedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
