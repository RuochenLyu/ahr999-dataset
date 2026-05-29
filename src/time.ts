import { DAY_MS } from "./config.js";

export function dateToUtcMs(value: string): number {
  const ms = new Date(`${value}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(ms)) {
    throw new Error(`Invalid date: ${value}`);
  }
  return ms;
}

export function utcMsToDate(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return utcMsToDate(dateToUtcMs(value) + days * DAY_MS);
}

export function subtractDays(value: string, days: number): string {
  return addDays(value, -days);
}

export interface DateSpan {
  start: string;
  end: string;
  days: number;
}

export function countDaysInclusive(startDate: string, endDate: string): number {
  if (endDate < startDate) {
    return 0;
  }
  return (
    Math.floor((dateToUtcMs(endDate) - dateToUtcMs(startDate)) / DAY_MS) + 1
  );
}

export function findMissingDateSpans(
  dates: string[],
  startDate: string,
  endDate: string,
): DateSpan[] {
  if (endDate < startDate) {
    return [];
  }

  const sortedDates = [...new Set(dates)]
    .filter((date) => date >= startDate && date <= endDate)
    .sort();
  const spans: DateSpan[] = [];
  let expected = startDate;

  for (const date of sortedDates) {
    if (date > expected) {
      const gapEnd = subtractDays(date, 1);
      spans.push({
        start: expected,
        end: gapEnd,
        days: countDaysInclusive(expected, gapEnd),
      });
    }
    expected = addDays(date, 1);
  }

  if (expected <= endDate) {
    spans.push({
      start: expected,
      end: endDate,
      days: countDaysInclusive(expected, endDate),
    });
  }

  return spans;
}

export function lastClosedUtcDay(now: number = Date.now()): string {
  return utcMsToDate(now - DAY_MS);
}

export function todayUtc(now: number = Date.now()): string {
  return utcMsToDate(now);
}
