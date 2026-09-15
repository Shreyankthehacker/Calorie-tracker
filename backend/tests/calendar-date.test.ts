import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  calendarDateInTimeZone,
  calendarDayEndUtc,
  calendarDayStartUtc,
  eachCalendarDateInclusive,
  inclusiveDayCount,
  mondayOfContainingWeek,
  parseDateOnly,
  resolveTimeZone,
} from '../src/lib/calendar-date.js';

describe('calendar-date', () => {
  it('parses valid YYYY-MM-DD dates and rejects impossible days', () => {
    expect(parseDateOnly('2026-09-15')).toEqual({ year: 2026, month: 9, day: 15 });
    expect(parseDateOnly('2026-02-29')).toBeNull();
    expect(parseDateOnly('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseDateOnly('15-09-2026')).toBeNull();
  });

  it('adds calendar days across month boundaries', () => {
    expect(addCalendarDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addCalendarDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('counts inclusive days and enumerates the range', () => {
    expect(inclusiveDayCount('2026-09-14', '2026-09-15')).toBe(2);
    expect(eachCalendarDateInclusive('2026-09-14', '2026-09-16')).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
    ]);
  });

  it('returns Monday of the containing ISO week', () => {
    expect(mondayOfContainingWeek('2026-09-15')).toBe('2026-09-14');
    expect(mondayOfContainingWeek('2026-09-14')).toBe('2026-09-14');
    expect(mondayOfContainingWeek('2026-09-13')).toBe('2026-09-07');
  });

  it('falls back to UTC for missing or invalid timezones', () => {
    expect(resolveTimeZone(undefined)).toBe('UTC');
    expect(resolveTimeZone('Not/AZone')).toBe('UTC');
    expect(resolveTimeZone('Asia/Kolkata')).toBe('Asia/Kolkata');
  });

  it('maps wall-clock days in Kolkata to UTC instants', () => {
    expect(calendarDayStartUtc('2026-09-15', 'Asia/Kolkata').toISOString()).toBe(
      '2026-09-14T18:30:00.000Z',
    );
    expect(calendarDayEndUtc('2026-09-15', 'Asia/Kolkata').toISOString()).toBe(
      '2026-09-15T18:29:59.999Z',
    );
    expect(calendarDateInTimeZone(new Date('2026-09-14T18:30:00.000Z'), 'Asia/Kolkata')).toBe(
      '2026-09-15',
    );
  });
});
