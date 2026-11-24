import { useMemo } from 'react';
import { groupCompanies, hookEntity, segmentLabel, TIERS } from '../model';
import { useStore } from '../store';
import { useTeam } from '../team';
import { BackBar, Banner, ExternalLink, List, OwnerIcon, PersonRow, Section, TierBadge } from '../ui';

export function CompanyView({ groupKey }: { groupKey: string }) {
  const { snapshot } = useStore();
  const { nameOf, isMe } = useTeam();
  const group = useMemo(
    () => groupCompanies(snapshot?.delegates ?? []).find((g) => g.key === groupKey),
    [snapshot, groupKey],
  );
  if (!group) {
    return (
      <>
        <BackBar title="Not found" />
        <p className="p-6 text-sm">This company is not on the current list.</p>
      </>
    );
  }

  const benelux =
    group.benelux === 'yes' ? 'Active in the Benelux' : group.benelux === 'no' ? 'No Benelux entity found' : 'Benelux presence unknown';
  const owners = [...new Set(group.people.map((p) => p.owner?.toLowerCase()).filter((o): o is string => !!o))].map((o) =>
    isMe(o) ? 'you' : nameOf(o),
  );

  return (
    <>
      <BackBar title={group.name} />
      <div className="rounded-b-3xl bg-brand-blue px-5 pb-6 text-white">
        <h1 className="text-2xl font-semibold leading-tight">{group.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TierBadge tier={group.tier} large />
          <span className="text-sm text-white/80">{TIERS[group.tier].hint}</span>
        </div>
        {owners.length > 0 && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm">
              <OwnerIcon size={13} />
              {owners.length === 1 ? 'Owner' : 'Owners'}: {owners.join(', ')}
            </span>
          </div>
        )}
      </div>

      <main className="space-y-3 px-4 pt-4">
        {group.warmHook && (
          <Banner tone="hook" title="Belgian opener">
            We are in conversation with {hookEntity(group.warmHook)}. Use it as an opener only. Nothing is signed: never
            mention tenders, end clients or contract status.
          </Banner>
        )}
        {group.tier === 'X_INTEL' && (
          <Banner tone="intel" title="Intel only">
            Competitor or VMS/MSP. Be friendly and listen; don't pitch or share client or roadmap details.
          </Banner>
        )}

        <Section title="About" action={group.linkedin ? <ExternalLink url={group.linkedin}>LinkedIn</ExternalLink> : undefined}>
          <p className="font-semibold">{segmentLabel(group.segment)}</p>
          {group.evidence && <p className="mt-1 text-sm text-brand-neutral/70">{group.evidence}</p>}
          <p className="mt-3 text-sm">
            {benelux}
            {group.countries.length ? ` · Delegates from ${group.countries.join(', ')}` : ''}
          </p>
        </Section>

        <h2 className="px-1 pt-2 text-xs font-semibold uppercase tracking-wider text-brand-neutral/55">
          At the event ({group.people.length})
        </h2>
        <List>
          {group.people.map((p) => (
            <PersonRow key={p.id} d={p} showCompany={false} />
          ))}
        </List>
      </main>
    </>
  );
}
