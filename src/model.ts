import type { Delegate, Outreach, Playbook, Tier } from './types';

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

/** Owners are team emails; `email` is expected in lower case. */
export const isOwner = (d: Delegate, email: string) => !!email && d.owner?.toLowerCase() === email;

export type Stage = 'todo' | 'check' | 'invited' | 'accepted' | 'booked' | 'met' | 'declined';

/** Where a contact is in the coffee pipeline, from the LinkedIn invite and coffee status. */
export function stageOf(d: Delegate): Stage {
  if (d.meeting_status === 'met' || d.meeting_status === 'no_show') return 'met';
  if (d.meeting_status === 'booked') return 'booked';
  switch (d.invite_status) {
    case 'declined':
      return 'declined';
    case 'accepted':
    case 'dm_sent':
    case 'replied':
      return 'accepted';
    case 'sent':
      return 'invited';
    default:
      return d.invite === 'review' ? 'check' : 'todo';
  }
}

/** On the coffee lists: everyone we invite, plus anyone a teammate has started talking to. */
export const inPipeline = (d: Delegate) => d.invite === 'yes' || d.invite === 'review' || stageOf(d) !== 'todo';

const COUNTRY_SHORT: Record<string, string> = { 'United Kingdom': 'UK', 'United States': 'US', USA: 'US' };

/** The LinkedIn connection note and follow-up DM for this person, signed by whoever sends them. */
export function inviteTexts(d: Delegate, outreach: Outreach | null | undefined, sender: string) {
  if (!outreach) return null;
  const persona = personaOf(d);
  const company = companyName(d);
  const country = d.country ? (COUNTRY_SHORT[d.country] ?? d.country) : '';
  const vars: Record<string, string> = {
    first: nice(d.first_name) || 'there',
    company,
    company_local: [company, country].filter(Boolean).join(' '),
    be_entity: d.warm_hook ? hookEntity(d.warm_hook) : company,
    pain: outreach.pains?.[persona] ?? outreach.pains?.EXECUTIVE_SPONSOR ?? '',
    sender,
  };
  const fill = (template: string | undefined) => (template ?? '').replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
  // Warm-hook delegates (Randstad, Manpower, Synergie) always get the Belgian-opener version.
  const warm = !!d.warm_hook;
  const note = fill(warm ? outreach.note_warm : (outreach.notes?.[persona] ?? outreach.notes?.EXECUTIVE_SPONSOR));
  const dm = fill(warm ? outreach.dm_warm : outreach.dm);
  if (!note && !dm) return null;
  return { note, dm, limit: outreach.note_limit ?? 300, freeLimit: outreach.note_limit_free ?? 200 };
}

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
