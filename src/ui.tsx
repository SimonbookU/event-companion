import type { ReactNode } from 'react';
import { companyName, fullName, TIERS, tierOf } from './model';
import { href } from './router';
import { useStore } from './store';
import { useTeam } from './team';
import { meetingLabel } from './time';
import type { Delegate, Tier } from './types';

export function TierBadge({ tier, large = false }: { tier: Tier; large?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${TIERS[tier].chip} ${
        large ? 'px-3 py-1 text-sm' : 'min-w-7 px-2 py-0.5 text-xs'
      }`}
    >
      {TIERS[tier].label}
    </span>
  );
}

export function Avatar({ d, size = 48, ring = false, onDark = false }: { d: Delegate; size?: number; ring?: boolean; onDark?: boolean }) {
  const { photos } = useStore();
  const url = d.photo_path ? photos[d.photo_path] : undefined;
  const initials = `${d.first_name?.[0] ?? ''}${d.last_name?.[0] ?? ''}`.toUpperCase();
  const shape = `shrink-0 rounded-2xl ${ring ? 'ring-2 ring-white' : ''}`;
  if (url) {
    return <img src={url} alt="" width={size} height={size} style={{ width: size, height: size }} className={`${shape} object-cover`} />;
  }
  return (
    <div
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(11, size / 3) }}
      className={`${shape} flex items-center justify-center font-semibold ${onDark ? 'bg-white/15 text-white' : TIERS[tierOf(d)].soft}`}
    >
      {initials}
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-neutral/55">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const BANNER_TONES = {
  warn: 'border-brand-orange bg-brand-orange/10',
  hook: 'border-brand-purple bg-brand-purple/20',
  intel: 'border-brand-pink bg-brand-pink/10',
};

export function Banner({ tone, title, children }: { tone: keyof typeof BANNER_TONES; title: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border-l-4 px-4 py-3 text-sm ${BANNER_TONES[tone]}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-0.5 text-brand-neutral/80">{children}</div>
    </div>
  );
}

export function PersonRow({
  d,
  showCompany = true,
  showOwner = true,
}: {
  d: Delegate;
  showCompany?: boolean;
  showOwner?: boolean;
}) {
  return (
    <a href={href.person(d.id)} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm active:bg-brand-blue-soft">
      <Avatar d={d} size={46} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{fullName(d)}</div>
        <div className="truncate text-sm text-brand-neutral/60">
          {[d.title, showCompany ? companyName(d) : null].filter(Boolean).join(' · ')}
        </div>
        <PersonStatus d={d} showOwner={showOwner} />
      </div>
      <TierBadge tier={tierOf(d)} />
    </a>
  );
}

function PersonStatus({ d, showOwner }: { d: Delegate; showOwner: boolean }) {
  const { nameOf, isMe } = useTeam();
  const bits: { text: string; tone: string; owner?: boolean }[] = [];
  if (d.meeting_status === 'booked' && d.meeting_at) bits.push({ text: `Coffee ${meetingLabel(d.meeting_at)}`, tone: 'bg-brand-blue text-white' });
  if (d.meeting_status === 'met') bits.push({ text: 'Met', tone: 'bg-brand-violet/20 text-brand-blue' });
  if (d.meeting_status === 'no_show') bits.push({ text: 'No-show', tone: 'bg-brand-neutral/10 text-brand-neutral/70' });
  if (d.invite === 'review') bits.push({ text: 'Check first', tone: 'bg-brand-orange/15 text-brand-orange' });
  if (d.warm_hook) bits.push({ text: 'BE opener', tone: 'bg-brand-purple/30 text-brand-blue' });
  if (showOwner && d.owner) {
    bits.push({ text: isMe(d.owner) ? 'You' : nameOf(d.owner), tone: 'bg-brand-blue-soft text-brand-blue', owner: true });
  }
  if (!bits.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {bits.map((b) => (
        <span
          key={b.text}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.tone}`}
          title={b.owner ? 'Owner' : undefined}
        >
          {b.owner && <OwnerIcon />}
          {b.owner && <span className="sr-only">Owner:</span>}
          {b.text}
        </span>
      ))}
    </div>
  );
}

export function OwnerIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

export function BackBar({ title, backTo }: { title: string; backTo?: string }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 bg-brand-blue px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
      <button
        type="button"
        onClick={() => (backTo ? (location.hash = backTo) : history.length > 1 ? history.back() : (location.hash = href.home))}
        className="flex h-10 w-10 items-center justify-center rounded-full active:bg-white/15"
        aria-label="Back"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <div className="min-w-0 truncate font-semibold">{title}</div>
    </div>
  );
}

export function ExternalLink({ url, children }: { url: string; children: ReactNode }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white active:opacity-80"
    >
      {children}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17 17 7M8 7h9v9" />
      </svg>
    </a>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-[15px]">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-violet" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
