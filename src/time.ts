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

export function lastClosedUtcDay(now: number = Date.now()): string {
  return utcMsToDate(now - DAY_MS);
}

export function todayUtc(now: number = Date.now()): string {
  return utcMsToDate(now);
}
