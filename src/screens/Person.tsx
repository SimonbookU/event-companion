import { useMemo, useState, type ReactNode } from 'react';
import { companyName, fullName, hookEntity, playbookFor, segmentLabel, tierOf } from '../model';
import { href } from '../router';
import { useStore, type SaveResult } from '../store';
import { dayLabel, eventDays, eventTimeToIso, isoToEventTime, meetingLabel } from '../time';
import type { AgendaItem, Delegate, Editable, Interest, InviteStatus, MeetingStatus } from '../types';
import { Avatar, BackBar, Banner, Bullets, ExternalLink, Section, TierBadge } from '../ui';

export function PersonView({ id }: { id: number }) {
  const { snapshot } = useStore();
  const d = snapshot?.delegates.find((x) => x.id === id);
  if (!snapshot || !d) {
    return (
      <>
        <BackBar title="Not found" />
        <p className="p-6 text-sm">This person is not on the current list.</p>
      </>
    );
  }
  const tier = tierOf(d);
  const intel = tier === 'X_INTEL';
  const play = playbookFor(d, snapshot.playbook);
  const hasPlay =
    !!play && !!(play.role_in_deal || play.angle || play.proof || play.pains.length || play.questions.length || play.avoid.length);
  const colleagues = snapshot.delegates.filter((x) => x.id !== d.id && companyName(x) === companyName(d));

  return (
    <>
      <BackBar title={companyName(d)} />
      <div className="rounded-b-3xl bg-brand-blue px-5 pb-6 text-white">
        <div className="flex items-start gap-4">
          <Avatar d={d} size={104} onDark />
          <div className="min-w-0 pt-1">
            <h1 className="text-xl font-semibold leading-tight">{fullName(d)}</h1>
            {d.title && <p className="mt-1 text-sm text-white/80">{d.title}</p>}
            <a
              href={href.company(companyName(d))}
              className="mt-1 block text-sm font-semibold underline decoration-white/30 underline-offset-4"
            >
              {companyName(d)}
              {d.country ? ` · ${d.country}` : ''}
            </a>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <TierBadge tier={tier} large />
          {play && <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{play.label}</span>}
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm">
            {d.invite === 'yes' ? 'Invite for coffee' : d.invite === 'review' ? 'Check before inviting' : 'No outreach'}
          </span>
        </div>
      </div>

      <main className="space-y-3 px-4 pt-4">
        {d.profile_flag && (
          <Banner tone="warn" title="Check first">
            {d.profile_flag.replace(/^Check first:\s*/i, '')}
          </Banner>
        )}
        {d.warm_hook && (
          <Banner tone="hook" title="Belgian opener">
            We are in conversation with {hookEntity(d.warm_hook)}. Use it as an opener only. Nothing is signed: never
            mention tenders, end clients or contract status.
          </Banner>
        )}
        {intel && (
          <Banner tone="intel" title="Intel only">
            Competitor or VMS/MSP. Be friendly and listen; don't pitch or share client or roadmap details.
          </Banner>
        )}

        {d.icebreaker && (
          <Section title="Opener">
            <p className="text-[15px] leading-relaxed">“{d.icebreaker}”</p>
          </Section>
        )}

        <Section title="Background" action={d.linkedin_url ? <ExternalLink url={d.linkedin_url}>LinkedIn</ExternalLink> : undefined}>
          <dl className="space-y-3 text-[15px]">
            {d.headline && <Field label="Headline">{d.headline}</Field>}
            {d.role_since && <Field label="In role since">{d.role_since}</Field>}
            {(d.city || d.country) && <Field label="Based in">{[d.city, d.country].filter(Boolean).join(', ')}</Field>}
            {d.profile_note && <Field label="Good to know">{d.profile_note}</Field>}
          </dl>
          {!d.headline && !d.linkedin_url && (
            <p className="mt-3 text-sm text-brand-neutral/60">No LinkedIn profile found yet.</p>
          )}
        </Section>

        {!!d.recent_posts?.length && (
          <Section title="Recent LinkedIn posts">
            <ul className="space-y-3">
              {d.recent_posts.map((p) => (
                <li key={`${p.month}-${p.topic}`} className="text-[15px]">
                  <span className="mr-2 text-xs font-semibold text-brand-violet">{p.month}</span>
                  {p.topic}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {play && hasPlay && !intel && (
          <Section title="How to talk to them">
            {play.role_in_deal && <p className="text-[15px] font-semibold">{play.role_in_deal}</p>}
            {play.angle && <p className="mt-1 text-[15px] text-brand-neutral/75">{play.angle}</p>}
            {play.pains.length > 0 && (
              <Sub title="Likely pains">
                <Bullets items={play.pains} />
              </Sub>
            )}
            {play.questions.length > 0 && (
              <Sub title="Ask">
                <Bullets items={play.questions} />
              </Sub>
            )}
            {play.proof && (
              <Sub title="Proof">
                <p className="text-[15px]">{play.proof}</p>
              </Sub>
            )}
            {play.avoid.length > 0 && (
              <Sub title="Avoid">
                <Bullets items={play.avoid} />
              </Sub>
            )}
          </Section>
        )}

        <Section
          title="Company"
          action={
            <a href={href.company(companyName(d))} className="text-sm font-semibold text-brand-violet">
              Open
            </a>
          }
        >
          <p className="font-semibold">{segmentLabel(d.segment)}</p>
          {d.segment_evidence && <p className="mt-1 text-sm text-brand-neutral/70">{d.segment_evidence}</p>}
          {d.benelux_presence === 'yes' && <p className="mt-2 text-sm">Active in the Benelux</p>}
          {colleagues.length > 0 && (
            <Sub title="Also at the event">
              <div className="flex flex-wrap gap-3">
                {colleagues.map((c) => (
                  <a key={c.id} href={href.person(c.id)} className="flex w-16 flex-col items-center gap-1 text-center">
                    <Avatar d={c} size={48} />
                    <span className="line-clamp-2 text-[11px] leading-tight">{fullName(c)}</span>
                  </a>
                ))}
              </div>
            </Sub>
          )}
        </Section>

        <NotesForm key={d.id} d={d} agenda={snapshot.event.agenda ?? []} />
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-brand-neutral/50">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Sub({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="mb-1.5 text-sm font-semibold text-brand-blue">{title}</h3>
      {children}
    </div>
  );
}

const INVITE_OPTIONS: { value: InviteStatus; label: string }[] = [
  { value: 'todo', label: 'To do' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'dm_sent', label: 'DM sent' },
  { value: 'replied', label: 'Replied' },
  { value: 'declined', label: 'Declined' },
];
const MEETING_OPTIONS: { value: MeetingStatus; label: string }[] = [
  { value: 'none', label: 'No coffee yet' },
  { value: 'booked', label: 'Coffee booked' },
  { value: 'met', label: 'Met' },
  { value: 'no_show', label: 'No-show' },
];
const INTEREST_OPTIONS: { value: Interest; label: string }[] = [
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
];

const editableOf = (d: Delegate): Editable => ({
  invite_status: d.invite_status ?? 'todo',
  meeting_status: d.meeting_status ?? 'none',
  meeting_at: d.meeting_at,
  next_step: d.next_step,
  notes: d.notes,
  interest: d.interest,
  owner: d.owner,
});

const inputClass =
  'w-full min-w-0 rounded-2xl border border-brand-neutral/15 bg-surface px-4 py-3 text-base outline-none focus:border-brand-violet';

function NotesForm({ d, agenda }: { d: Delegate; agenda: AgendaItem[] }) {
  const { save } = useStore();
  const base = useMemo(() => editableOf(d), [d]);
  // Only the fields you touch are kept locally; everything else follows the latest
  // server values, so saving never overwrites a teammate's change to another field.
  const [edits, setEdits] = useState<Partial<Editable>>({});
  const [result, setResult] = useState<SaveResult | 'saving' | null>(null);
  const days = eventDays(agenda);
  const [pickedDay, setPickedDay] = useState(days[0] ?? '');
  const form: Editable = { ...base, ...edits };

  const patch = useMemo(() => {
    const out: Partial<Editable> = {};
    for (const key of Object.keys(edits) as (keyof Editable)[]) {
      if ((edits[key] ?? null) !== (base[key] ?? null)) Object.assign(out, { [key]: edits[key] ?? null });
    }
    return out;
  }, [edits, base]);
  const dirty = Object.keys(patch).length > 0;

  const set = <K extends keyof Editable>(key: K, value: Editable[K]) => {
    setResult(null);
    setEdits((e) => ({ ...e, [key]: value }));
  };
  const when = form.meeting_at ? isoToEventTime(form.meeting_at) : null;
  const day = when?.day ?? pickedDay;
  const setMeetingTime = (newDay: string, time: string) => set('meeting_at', newDay && time ? eventTimeToIso(newDay, time) : null);
  const slots = agenda.filter((a) => a.day === day && a.kind === 'networking');

  async function onSave() {
    setResult('saving');
    const outcome = await save(d.id, patch);
    setEdits({});
    setResult(outcome);
  }

  const footer =
    result === 'saving'
      ? 'Saving…'
      : result === 'synced'
        ? 'Saved'
        : result === 'queued'
          ? "Saved on this phone. It syncs when you're back online."
          : d.updated_by?.includes('@') && d.updated_at
            ? `Last change by ${d.updated_by.split('@')[0]} · ${meetingLabel(d.updated_at)}`
            : null;

  return (
    <Section title="Your notes">
      <div className="space-y-5">
        <div>
          <Label>LinkedIn invite</Label>
          <Choice value={form.invite_status} options={INVITE_OPTIONS} onChange={(v) => set('invite_status', v ?? 'todo')} />
        </div>

        <div>
          <Label>Coffee</Label>
          <Choice
            value={form.meeting_status}
            options={MEETING_OPTIONS}
            onChange={(v) => {
              set('meeting_status', v ?? 'none');
              if (!v || v === 'none') set('meeting_at', null);
            }}
          />
          {(form.meeting_status === 'booked' || form.meeting_status === 'met') && (
            <div className="mt-3 space-y-3 rounded-2xl bg-surface p-3">
              <div className="flex gap-2">
                <select
                  value={day}
                  onChange={(e) => (when ? setMeetingTime(e.target.value, when.time) : setPickedDay(e.target.value))}
                  className={`${inputClass} bg-white`}
                  aria-label="Day"
                >
                  {days.map((dd) => (
                    <option key={dd} value={dd}>
                      {dayLabel(dd)}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={when?.time ?? ''}
                  onChange={(e) => setMeetingTime(day, e.target.value)}
                  className={`${inputClass} bg-white`}
                  aria-label="Time (London)"
                />
              </div>
              {slots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => setMeetingTime(day, s.start)}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-blue"
                    >
                      {s.start} {s.title.replace(/^Networking\s*/i, '').replace(/\s*& exhibits/i, '')}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-brand-neutral/55">London time</p>
            </div>
          )}
        </div>

        <div>
          <Label>Interest</Label>
          <Choice value={form.interest} options={INTEREST_OPTIONS} onChange={(v) => set('interest', v)} />
        </div>

        <label className="block">
          <Label>Next step</Label>
          <input
            value={form.next_step ?? ''}
            onChange={(e) => set('next_step', e.target.value || null)}
            placeholder="e.g. demo with their COO in January"
            className={inputClass}
          />
        </label>

        <label className="block">
          <Label>Notes</Label>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value || null)}
            rows={4}
            placeholder="What did you learn? Systems they use, pains, who decides…"
            className={inputClass}
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!dirty || result === 'saving'}
        onClick={() => void onSave()}
        className="mt-5 w-full rounded-full bg-brand-orange py-3 font-semibold text-white active:opacity-80 disabled:opacity-40"
      >
        Save
      </button>
      {footer && <p className="mt-2 text-center text-xs text-brand-neutral/60">{footer}</p>}
    </Section>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <span className="mb-2 block text-sm font-semibold text-brand-blue">{children}</span>;
}

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : o.value)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              active ? 'border-brand-blue bg-brand-blue text-white' : 'border-brand-neutral/15 bg-white'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
