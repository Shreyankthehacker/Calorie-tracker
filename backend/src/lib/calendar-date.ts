const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function partsMap(date: Date, timeZone: string): Record<string, number> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const values: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      values[part.type] = Number(part.value);
    }
  }
  return values;
}

function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const asZone = partsMap(new Date(utcGuess), timeZone);
  const asUtc = Date.UTC(
    asZone.year ?? year,
    (asZone.month ?? month) - 1,
    asZone.day ?? day,
    asZone.hour ?? hour,
    asZone.minute ?? minute,
    asZone.second ?? second,
  );
  return new Date(utcGuess - (asUtc - utcGuess));
}

export function resolveTimeZone(timeZone: string | null | undefined): string {
  if (timeZone && isValidTimeZone(timeZone)) {
    return timeZone;
  }
  return 'UTC';
}

export function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
  const match = DATE_ONLY.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/** Inclusive start of a calendar day in the user's timezone, as a UTC instant. */
export function calendarDayStartUtc(dateStr: string, timeZone: string): Date {
  const parsed = parseDateOnly(dateStr);
  if (!parsed) {
    throw new Error(`Invalid calendar date: ${dateStr}`);
  }
  return zonedWallTimeToUtc(parsed.year, parsed.month, parsed.day, 0, 0, 0, timeZone);
}

/** Inclusive end of a calendar day in the user's timezone, as a UTC instant. */
export function calendarDayEndUtc(dateStr: string, timeZone: string): Date {
  const parsed = parseDateOnly(dateStr);
  if (!parsed) {
    throw new Error(`Invalid calendar date: ${dateStr}`);
  }
  const nextDay = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1));
  const nextIso = `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDay.getUTCDate()).padStart(2, '0')}`;
  const nextStart = calendarDayStartUtc(nextIso, timeZone);
  return new Date(nextStart.getTime() - 1);
}

export function calendarDateInTimeZone(instant: Date, timeZone: string): string {
  const parts = partsMap(instant, timeZone);
  const year = String(parts.year ?? 0).padStart(4, '0');
  const month = String(parts.month ?? 0).padStart(2, '0');
  const day = String(parts.day ?? 0).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateOnly(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addCalendarDays(dateStr: string, days: number): string {
  const parsed = parseDateOnly(dateStr);
  if (!parsed) {
    throw new Error(`Invalid calendar date: ${dateStr}`);
  }
  const next = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return formatDateOnly(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

export function inclusiveDayCount(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) {
    throw new Error(`Invalid calendar date range: ${startDate}..${endDate}`);
  }
  const ms =
    Date.UTC(end.year, end.month - 1, end.day) - Date.UTC(start.year, start.month - 1, start.day);
  return Math.floor(ms / 86_400_000) + 1;
}

export function eachCalendarDateInclusive(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addCalendarDays(current, 1);
  }
  return dates;
}
