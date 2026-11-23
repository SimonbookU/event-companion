import { EVENT_TZ } from './config';
import type { AgendaItem } from './types';

// All times in the app are event-local (London wall clock), whatever the phone's own time zone.

function partsIn(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EVENT_TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour'), mi: get('minute'), s: get('second') };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Event-local day + time ("2026-12-01", "11:00") to an ISO instant. */
export function eventTimeToIso(day: string, time: string): string {
  const guess = new Date(`${day}T${time}:00Z`);
  const p = partsIn(guess);
  const offset = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - guess.getTime();
  return new Date(guess.getTime() - offset).toISOString();
}

/** ISO instant to event-local day ("YYYY-MM-DD") and time ("HH:MM"). */
export function isoToEventTime(iso: string): { day: string; time: string } {
  const p = partsIn(new Date(iso));
  return { day: `${p.y}-${pad(p.mo)}-${pad(p.d)}`, time: `${pad(p.h)}:${pad(p.mi)}` };
}

export function dayLabel(day: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(
    new Date(`${day}T12:00:00Z`),
  );
}

export function meetingLabel(iso: string): string {
  const { day, time } = isoToEventTime(iso);
  return `${dayLabel(day)} · ${time}`;
}

export function eventDays(agenda: AgendaItem[]): string[] {
  return [...new Set(agenda.map((a) => a.day))].sort();
}

/** The agenda item happening now, or the next one coming up. */
export function nextAgendaItem(agenda: AgendaItem[]): { item: AgendaItem; live: boolean } | null {
  const { day, time } = isoToEventTime(new Date().toISOString());
  const now = `${day} ${time}`;
  const sorted = [...agenda].sort((a, b) => `${a.day} ${a.start}`.localeCompare(`${b.day} ${b.start}`));
  for (const item of sorted) {
    if (now < `${item.day} ${item.end}`) return { item, live: now >= `${item.day} ${item.start}` };
  }
  return null;
}
