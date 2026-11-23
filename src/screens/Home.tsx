import { useMemo, type ReactNode } from 'react';
import {
  byTierThenName,
  groupCompanies,
  normalise,
  personMatches,
  segmentLabel,
  TIER_ORDER,
  TIERS,
  tierOf,
  type CompanyGroup,
} from '../model';
import { href } from '../router';
import { AppHeader } from '../shell';
import { useStore } from '../store';
import type { Delegate, Tier } from '../types';
import { Avatar, List, PersonRow } from '../ui';
import { useSessionState } from '../useSessionState';

type Filter = Tier | 'ALL';
type View = 'companies' | 'people';

export function Home() {
  const { snapshot } = useStore();
  const delegates = snapshot?.delegates ?? [];
  const [query, setQuery] = useSessionState<string>('home:query', '');
  const [filter, setFilter] = useSessionState<Filter>('home:tier', 'ALL');
  const [view, setView] = useSessionState<View>('home:view', 'companies');
  const q = normalise(query.trim());

  const counts = useMemo(() => {
    const c: Partial<Record<Tier, number>> = {};
    for (const d of delegates) c[tierOf(d)] = (c[tierOf(d)] ?? 0) + 1;
    return c;
  }, [delegates]);
  const people = useMemo(
    () =>
      delegates
        .filter((d) => (filter === 'ALL' || tierOf(d) === filter) && (!q || personMatches(d, q)))
        .sort(byTierThenName),
    [delegates, filter, q],
  );
  const companies = useMemo(
    () =>
      groupCompanies(delegates).filter(
        (g) =>
          (filter === 'ALL' || g.tier === filter) &&
          (!q || normalise(g.name).includes(q) || g.people.some((p) => personMatches(p, q))),
      ),
    [delegates, filter, q],
  );

  return (
    <>
      <AppHeader>
        <label className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-brand-neutral">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0 opacity-50">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a name or company"
            aria-label="Search a name or company"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-brand-neutral/45"
          />
        </label>
      </AppHeader>

      <main className="space-y-4 px-4 pt-4">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {(['ALL', ...TIER_ORDER.filter((t) => counts[t])] as Filter[]).map((f) => {
            const active = filter === f;
            const tier = f === 'ALL' ? null : TIERS[f];
            return (
              <button
                key={f}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  active ? 'border-brand-blue bg-brand-blue text-white' : 'border-brand-neutral/15 bg-white'
                }`}
              >
                {tier && <span className={`h-2.5 w-2.5 rounded-full ${tier.dot}`} />}
                {f === 'ALL' ? 'All' : tier?.label}
                <span className={active ? 'text-white/70' : 'text-brand-neutral/45'}>
                  {f === 'ALL' ? delegates.length : counts[f]}
                </span>
              </button>
            );
          })}
        </div>

        {q ? (
          <SearchResults people={people} companies={companies} />
        ) : (
          <>
            <div className="flex rounded-full bg-white p-1 shadow-sm">
              {(['companies', 'people'] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize ${
                    view === v ? 'bg-brand-blue text-white' : 'text-brand-neutral/60'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            {view === 'companies' ? (
              <CompanyList companies={companies} grouped={filter === 'ALL'} />
            ) : (
              <List>
                {people.map((d) => (
                  <PersonRow key={d.id} d={d} />
                ))}
              </List>
            )}
          </>
        )}
      </main>
    </>
  );
}

function SearchResults({ people, companies }: { people: Delegate[]; companies: CompanyGroup[] }) {
  if (!people.length && !companies.length) {
    return <p className="px-1 py-8 text-center text-sm text-brand-neutral/60">Nobody on the list matches that search.</p>;
  }
  return (
    <>
      {people.length > 0 && (
        <div>
          <Heading>People ({people.length})</Heading>
          <List>
            {people.slice(0, 40).map((d) => (
              <PersonRow key={d.id} d={d} />
            ))}
          </List>
        </div>
      )}
      {companies.length > 0 && (
        <div>
          <Heading>Companies ({companies.length})</Heading>
          <List>
            {companies.map((g) => (
              <CompanyRow key={g.key} g={g} />
            ))}
          </List>
        </div>
      )}
    </>
  );
}

function CompanyList({ companies, grouped }: { companies: CompanyGroup[]; grouped: boolean }) {
  if (!grouped) {
    return (
      <List>
        {companies.map((g) => (
          <CompanyRow key={g.key} g={g} />
        ))}
      </List>
    );
  }
  return (
    <>
      {TIER_ORDER.map((tier) => {
        const inTier = companies.filter((g) => g.tier === tier);
        if (!inTier.length) return null;
        return (
          <div key={tier}>
            <Heading>
              {TIERS[tier].name} · {TIERS[tier].hint}
            </Heading>
            <List>
              {inTier.map((g) => (
                <CompanyRow key={g.key} g={g} />
              ))}
            </List>
          </div>
        );
      })}
    </>
  );
}

function CompanyRow({ g }: { g: CompanyGroup }) {
  return (
    <a
      href={href.company(g.key)}
      className="flex items-center gap-3 overflow-hidden rounded-2xl bg-white py-3 pr-3 shadow-sm active:bg-brand-blue-soft"
    >
      <span className={`h-11 w-1.5 shrink-0 rounded-r-full ${TIERS[g.tier].dot}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{g.name}</div>
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-brand-neutral/60">
          {g.warmHook && (
            <span className="shrink-0 rounded-full bg-brand-purple/30 px-2 py-0.5 text-[11px] font-semibold text-brand-blue">
              BE opener
            </span>
          )}
          <span className="truncate">
            {segmentLabel(g.segment)}
            {g.countries.length ? ` · ${g.countries.join(', ')}` : ''}
          </span>
        </div>
      </div>
      <div className="flex -space-x-2">
        {g.people.slice(0, 3).map((p) => (
          <Avatar key={p.id} d={p} size={30} ring />
        ))}
      </div>
      <span className="w-5 text-right text-sm text-brand-neutral/50">{g.people.length}</span>
    </a>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 mt-2 px-1 text-xs font-semibold uppercase tracking-wider text-brand-neutral/55">{children}</h2>;
}
