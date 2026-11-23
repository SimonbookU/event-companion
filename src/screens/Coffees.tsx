import { byTierThenName } from '../model';
import { AppHeader } from '../shell';
import { useStore } from '../store';
import type { Delegate } from '../types';
import { List, PersonRow } from '../ui';

const byMeetingTime = (a: Delegate, b: Delegate) => (a.meeting_at ?? '').localeCompare(b.meeting_at ?? '');

export function Coffees() {
  const { snapshot } = useStore();
  const ds = snapshot?.delegates ?? [];
  const booked = ds.filter((d) => d.meeting_status === 'booked').sort(byMeetingTime);
  const met = ds.filter((d) => d.meeting_status === 'met').sort(byMeetingTime);
  const followUp = ds
    .filter((d) => ['accepted', 'dm_sent', 'replied'].includes(d.invite_status ?? '') && (d.meeting_status ?? 'none') === 'none')
    .sort(byTierThenName);
  const toInvite = ds.filter((d) => d.invite === 'yes' && (d.invite_status ?? 'todo') === 'todo').sort(byTierThenName);
  const checkFirst = ds.filter((d) => d.invite === 'review').sort(byTierThenName);

  return (
    <>
      <AppHeader title="Coffees" />
      <main className="space-y-6 px-4 pt-4">
        <Block title="Booked" empty="No coffees booked yet." items={booked} />
        <Block title="Accepted, no coffee yet" empty="Nobody waiting for a time slot." items={followUp} />
        <Block title="Met" empty="Nobody marked as met yet." items={met} />
        <Block title="Still to invite" empty="Every invite is out." items={toInvite} />
        <Block title="Check before inviting" empty="Nothing to check." items={checkFirst} />
      </main>
    </>
  );
}

function Block({ title, empty, items }: { title: string; empty: string; items: Delegate[] }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-brand-neutral/55">
        {title} ({items.length})
      </h2>
      {items.length ? (
        <List>
          {items.map((d) => (
            <PersonRow key={d.id} d={d} />
          ))}
        </List>
      ) : (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-brand-neutral/55">{empty}</p>
      )}
    </section>
  );
}
