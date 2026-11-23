import type { Delegate, Playbook, Tier } from './types';

export const TIER_ORDER: Tier[] = ['A', 'B', 'TBD', 'C', 'X_INTEL'];

// Colour plus a text label, so tiers never rely on colour alone.
export const TIERS: Record<Tier, { label: string; name: string; hint: string; dot: string; chip: string; soft: string }> = {
  A: {
    label: 'A',
    name: 'Tier A',
    hint: 'ICP with a Benelux presence',
    dot: 'bg-brand-orange',
    chip: 'bg-brand-orange text-white',
    soft: 'bg-brand-orange/15 text-brand-orange',
  },
  B: {
    label: 'B',
    name: 'Tier B',
    hint: 'ICP elsewhere in Europe',
    dot: 'bg-brand-violet',
    chip: 'bg-brand-violet text-white',
    soft: 'bg-brand-violet/20 text-brand-blue',
  },
  TBD: {
    label: 'New',
    name: 'Not scored yet',
    hint: 'New on the latest list',
    dot: 'bg-brand-violet-light',
    chip: 'bg-brand-violet-light text-brand-blue',
    soft: 'bg-brand-violet-light/30 text-brand-blue',
  },
  C: {
    label: 'C',
    name: 'Tier C',
    hint: 'Not ICP: no outreach',
    dot: 'bg-brand-neutral/30',
    chip: 'bg-brand-neutral/55 text-white',
    soft: 'bg-brand-neutral/10 text-brand-neutral/70',
  },
  X_INTEL: {
    label: 'Intel',
    name: 'Intel',
    hint: 'Competitor or VMS/MSP: listen, do not pitch',
    dot: 'bg-brand-pink',
    chip: 'bg-brand-pink text-white',
    soft: 'bg-brand-pink/15 text-brand-pink',
  },
};

const SEGMENTS: Record<string, string> = {
  FLEX_BLUE_COLLAR: 'Flex / blue collar',
  HEALTHCARE_SHIFT: 'Healthcare shifts',
  MIXED: 'Mixed flex + professional',
  'TECHNICAL (blue)': 'Technical (blue collar)',
  'TECHNICAL (white)': 'Technical (engineers)',
  TECHNICAL: 'Technical staffing',
  WHITE_COLLAR: 'White collar / professional',
  MSP_RPO: 'MSP / RPO',
};

export const segmentLabel = (segment: string | null) => (segment ? SEGMENTS[segment] ?? segment : 'Segment unknown');
export const tierOf = (d: Delegate): Tier => d.tier ?? 'TBD';
export const tierRank = (t: Tier) => TIER_ORDER.indexOf(t);
export const personaOf = (d: Delegate) => d.persona_override ?? d.persona ?? 'OTHER';
export const playbookFor = (d: Delegate, playbook: Playbook[]) =>
  playbook.find((p) => p.persona === personaOf(d)) ?? playbook.find((p) => p.persona === 'OTHER');

/** Names arrive as typed by delegates ("kevin roy"): capitalise all-lowercase ones. */
const nice = (s: string | null) =>
  !s ? '' : s === s.toLowerCase() ? s.replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase()) : s;

/** "BE: ongoing conversations with Randstad Belgium (bookU)" -> "Randstad Belgium". */
export const hookEntity = (hook: string) =>
  hook.replace(/^BE:\s*ongoing conversations with\s*/i, '').replace(/\s*\(bookU\)\s*$/i, '');

export const fullName = (d: Delegate) => [nice(d.first_name), nice(d.last_name)].filter(Boolean).join(' ');
export const companyName = (d: Delegate) => d.company_group ?? d.company ?? 'Unknown company';

export const normalise = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export const personMatches = (d: Delegate, q: string) =>
  normalise([fullName(d), d.title, d.company, d.company_group].filter(Boolean).join(' ')).includes(q);

export const byTierThenName = (a: Delegate, b: Delegate) =>
  tierRank(tierOf(a)) - tierRank(tierOf(b)) || fullName(a).localeCompare(fullName(b));

export interface CompanyGroup {
  key: string;
  name: string;
  tier: Tier;
  people: Delegate[];
  segment: string | null;
  evidence: string | null;
  benelux: string | null;
  linkedin: string | null;
  countries: string[];
  warmHook: string | null;
}

export function groupCompanies(delegates: Delegate[]): CompanyGroup[] {
  const groups = new Map<string, Delegate[]>();
  for (const d of delegates) {
    const key = companyName(d);
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  return [...groups.entries()]
    .map(([key, people]) => {
      const sorted = [...people].sort(byTierThenName);
      const first = <K extends keyof Delegate>(k: K) => sorted.find((p) => p[k] != null)?.[k] ?? null;
      return {
        key,
        name: key,
        tier: tierOf(sorted[0]),
        people: sorted,
        segment: first('segment') as string | null,
        evidence: first('segment_evidence') as string | null,
        benelux: first('benelux_presence') as string | null,
        linkedin: first('company_linkedin_url') as string | null,
        countries: [...new Set(sorted.map((p) => p.country).filter((c): c is string => !!c))],
        warmHook: first('warm_hook') as string | null,
      };
    })
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.name.localeCompare(b.name));
}
