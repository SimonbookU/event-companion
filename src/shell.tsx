import type { ReactNode } from 'react';
import { href } from './router';
import { useStore } from './store';
import { dayLabel, nextAgendaItem } from './time';

function eventDates(start: string, end: string) {
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...opts }).format(new Date(`${d}T12:00:00Z`));
  return start === end
    ? fmt(start, { day: 'numeric', month: 'short' })
    : `${fmt(start, { day: 'numeric' })}–${fmt(end, { day: 'numeric', month: 'short' })}`;
}

function SyncState() {
  const { online, syncing, pendingCount } = useStore();
  const text = !online ? 'Offline · saved data' : syncing ? 'Syncing…' : pendingCount ? `${pendingCount} to sync` : null;
  if (!text) return null;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${online ? 'bg-white/15' : 'bg-brand-orange text-white'}`}>
      {text}
    </span>
  );
}

export function AppHeader({ title, children }: { title?: string; children?: ReactNode }) {
  const { snapshot } = useStore();
  const ev = snapshot?.event;
  const next = ev?.agenda ? nextAgendaItem(ev.agenda.filter((a) => a.kind !== 'intel')) : null;
  return (
    <header className="rounded-b-3xl bg-brand-blue px-5 pb-5 pt-[max(1rem,env(safe-area-inset-top))] text-white">
      <div className="flex h-9 items-center justify-between gap-3">
        <img src="brand/logo-white.png" alt="bookU" className="h-6 w-auto" />
        <SyncState />
      </div>
      {title && <h1 className="mt-4 text-2xl font-semibold">{title}</h1>}
      {ev && (
        <div className={title ? 'mt-1' : 'mt-4'}>
          {!title && <div className="text-lg font-semibold leading-tight">{ev.name}</div>}
          <div className="text-sm text-white/70">
            {[eventDates(ev.starts_on, ev.ends_on), ev.location, ev.booth && `Booth ${ev.booth}`].filter(Boolean).join(' · ')}
          </div>
        </div>
      )}
      {next && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${next.live ? 'bg-brand-orange' : 'bg-white/20'}`}>
            {next.live ? 'Now' : 'Next'}
          </span>
          <span className="min-w-0 truncate">
            {dayLabel(next.item.day)} {next.item.start}–{next.item.end} · {next.item.title}
          </span>
        </div>
      )}
      {children}
    </header>
  );
}

const TABS = [
  {
    key: 'home',
    label: 'People',
    to: href.home,
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .7 3.5 2.8 3.5 6" />
      </>
    ),
  },
  {
    key: 'coffees',
    label: 'Coffees',
    to: href.coffees,
    icon: (
      <>
        <path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
        <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3" />
      </>
    ),
  },
  {
    key: 'agenda',
    label: 'Agenda',
    to: href.agenda,
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="3" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
  },
];

export function BottomNav({ active }: { active: string }) {
  const current = active === 'company' || active === 'person' ? 'home' : active;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-brand-neutral/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-xl">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={t.to}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-semibold ${
              current === t.key ? 'text-brand-blue' : 'text-brand-neutral/45'
            }`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              {t.icon}
            </svg>
            {t.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-xl items-start gap-3 rounded-2xl bg-brand-neutral px-4 py-3 text-sm text-white shadow-lg">
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onClose} className="font-semibold text-brand-violet-light">
        Close
      </button>
    </div>
  );
}
