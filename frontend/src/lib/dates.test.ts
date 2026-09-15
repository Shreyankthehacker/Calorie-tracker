import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  calendarDateInTimeZone,
  clipSeriesToToday,
  isoWeekRange,
  reportRangeForPreset,
} from './dates';

describe('dates', () => {
  it('formats a calendar date in a timezone', () => {
    expect(calendarDateInTimeZone(new Date('2026-09-14T18:30:00.000Z'), 'Asia/Kolkata')).toBe(
      '2026-09-15',
    );
  });

  it('adds calendar days and builds an ISO week range', () => {
    expect(addCalendarDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(isoWeekRange('2026-09-15')).toEqual({ startDate: '2026-09-14', endDate: '2026-09-20' });
  });

  it('does not extend this week past today', () => {
    const range = reportRangeForPreset('this_week', 'UTC', new Date('2026-09-15T12:00:00.000Z'));
    expect(range.startDate).toBe('2026-09-14');
    expect(range.endDate).toBe('2026-09-15');
  });

  it('resolves yesterday, last week, and custom ranges', () => {
    const now = new Date('2026-09-15T12:00:00.000Z');
    expect(reportRangeForPreset('yesterday', 'UTC', now)).toEqual({
      startDate: '2026-09-14',
      endDate: '2026-09-14',
    });
    expect(reportRangeForPreset('last_week', 'UTC', now)).toEqual({
      startDate: '2026-09-07',
      endDate: '2026-09-13',
    });
    expect(
      reportRangeForPreset('custom', 'UTC', now, { startDate: '2026-09-01', endDate: '2026-09-20' }),
    ).toEqual({ startDate: '2026-09-01', endDate: '2026-09-15' });
  });

  it('clips series rows after today', () => {
    expect(
      clipSeriesToToday(
        [
          { date: '2026-09-14', calories: 1 },
          { date: '2026-09-16', calories: 2 },
        ],
        '2026-09-15',
      ),
    ).toEqual([{ date: '2026-09-14', calories: 1 }]);
  });
});
