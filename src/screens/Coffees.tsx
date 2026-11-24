import type { ReactNode } from 'react';
import { byTierThenName, inPipeline, isOwner, stageOf, type Stage } from '../model';
import { AppHeader } from '../shell';
import { useStore } from '../store';
import { useTeam } from '../team';
import type { Delegate } from '../types';
import { List, PersonRow } from '../ui';
import { useSessionState } from '../useSessionState';

const byMeetingTime = (a: Delegate, b: Delegate) => (a.meeting_at ?? '').localeCompare(b.meeting_at ?? '');

// The order a teammate works through their list: first invite, then the coffees themselves.
const SECTIONS: { stage: Stage; title: string; empty?: string; sort: (a: Delegate, b: Delegate) => number }[] = [
  { stage: 'todo', title: 'Assigned · to invite', empty: 'Every invite is out.', sort: byTierThenName },
  { stage: 'booked', title: 'Coffee booked', empty: 'No coffees booked yet.', sort: byMeetingTime },
  { stage: 'accepted', title: 'Accepted · no coffee yet', sort: byTierThenName },
  { stage: 'invited', title: 'Invited · waiting for them', sort: byTierThenName },
  { stage: 'met', title: 'Met', sort: byMeetingTime },
  { stage: 'check', title: 'Check before inviting', sort: byTierThenName },
  { stage: 'declined', title: 'Declined', sort: byTierThenName },
];

// Funnel for the progress bars. "Check before inviting" still counts as to invite.
const FUNNEL: { label: string; stages: Stage[]; tone: string }[] = [
  { label: 'To invite', stages: ['todo', 'check'], tone: 'bg-brand-neutral/25' },
  { label: 'Invited', stages: ['invited'], tone: 'bg-brand-violet-light' },
  { label: 'Accepted', stages: ['accepted'], tone: 'bg-brand-violet' },
  { label: 'Booked', stages: ['booked'], tone: 'bg-brand-blue' },
  { label: 'Met', stages: ['met'], tone: 'bg-brand-orange' },
];

export function Coffees() {
  const { snapshot } = useStore();
  const { me, nameOf } = useTeam();
  const pipeline = (snapshot?.delegates ?? []).filter(inPipeline);
  const mine = pipeline.filter((d) => isOwner(d, me));
  const others = [...new Set(pipeline.map((d) => d.owner?.toLowerCase() ?? ''))]
    .filter((o) => o && o !== me)
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const unassigned = pipeline.filter((d) => !d.owner);

  const [scope, setScope] = useSessionState<string>('coffees:scope', mine.length ? 'me' : 'all');
  const current =
    scope === 'all' || (scope === 'me' && mine.length) || others.includes(scope) ? scope : mine.length ? 'me' : 'all';
  const ownerOf = (key: string) => (key === 'me' ? me : key);
  const people = current === 'all' ? pipeline : pipeline.filter((d) => isOwner(d, ownerOf(current)));

  return (
    <>
      <AppHeader title="Coffees" />
      <main className="space-y-6 px-4 pt-4">
        <div className="space-y-3">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
            {mine.length > 0 && <ScopeChip label="Mine" count={mine.length} active={current === 'me'} onClick={() => setScope('me')} />}
            {others.map((o) => (
              <ScopeChip
                key={o}
                label={nameOf(o)}
                count={pipeline.filter((d) => isOwner(d, o)).length}
                active={current === o}
                onClick={() => setScope(o)}
              />
            ))}
            <ScopeChip label="All" count={pipeline.length} active={current === 'all'} onClick={() => setScope('all')} />
          </div>

          {current === 'all' ? (
            <div className="space-y-2">
              {mine.length > 0 && <Progress people={mine} title={`${nameOf(me)} (you)`} onClick={() => setScope('me')} />}
              {others.map((o) => (
                <Progress key={o} people={pipeline.filter((d) => isOwner(d, o))} title={nameOf(o)} onClick={() => setScope(o)} />
              ))}
              {unassigned.length > 0 && <Progress people={unassigned} title="No owner yet" />}
            </div>
          ) : (
            <Progress people={people} />
          )}
        </div>

        {SECTIONS.map((s) => {
          const items = people.filter((d) => stageOf(d) === s.stage).sort(s.sort);
          if (!items.length && !s.empty) return null;
          return <Block key={s.stage} title={s.title} empty={s.empty} items={items} showOwner={current === 'all'} />;
        })}
      </main>
    </>
  );
}

function ScopeChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${
        active ? 'border-brand-blue bg-brand-blue text-white' : 'border-brand-neutral/15 bg-white'
      }`}
    >
      {label}
      <span className={active ? 'text-white/70' : 'text-brand-neutral/45'}>{count}</span>
    </button>
  );
}

function Progress({ people, title, onClick }: { people: Delegate[]; title?: ReactNode; onClick?: () => void }) {
  const counts = FUNNEL.map((f) => people.filter((d) => f.stages.includes(stageOf(d))).length);
  const total = counts.reduce((sum, n) => sum + n, 0);
  const body = (
    <>
      {title && (
        <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold">
          <span className="truncate">{title}</span>
          <span className="text-brand-neutral/45">{people.length}</span>
        </div>
      )}
      <div className="flex h-2.5 overflow-hidden rounded-full bg-brand-neutral/10" aria-hidden>
        {FUNNEL.map((f, i) =>
          counts[i] ? <span key={f.label} className={f.tone} style={{ width: `${(counts[i] / total) * 100}%` }} /> : null,
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-brand-neutral/70">
        {FUNNEL.map((f, i) => (
          <span key={f.label} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${f.tone}`} />
            {f.label}
            <strong className="font-semibold text-brand-neutral">{counts[i]}</strong>
          </span>
        ))}
      </div>
    </>
  );
  if (!onClick) return <div className="rounded-2xl bg-white p-4 shadow-sm">{body}</div>;
  return (
    <button type="button" onClick={onClick} className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm active:bg-brand-blue-soft">
      {body}
    </button>
  );
}

function Block({ title, empty, items, showOwner }: { title: string; empty?: string; items: Delegate[]; showOwner: boolean }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-brand-neutral/55">
        {title} ({items.length})
      </h2>
      {items.length ? (
        <List>
          {items.map((d) => (
            <PersonRow key={d.id} d={d} showOwner={showOwner} />
          ))}
        </List>
      ) : (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-brand-neutral/55">{empty}</p>
      )}
    </section>
  );
}
