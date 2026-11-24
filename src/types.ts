export type Tier = 'A' | 'B' | 'C' | 'X_INTEL' | 'TBD';
export type InviteStatus = 'todo' | 'sent' | 'accepted' | 'dm_sent' | 'replied' | 'declined';
export type MeetingStatus = 'none' | 'booked' | 'met' | 'no_show';
export type Interest = 'hot' | 'warm' | 'cold';

export interface RecentPost {
  month: string;
  topic: string;
}

export interface Delegate {
  id: number;
  company: string | null;
  company_group: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  city: string | null;
  country: string | null;
  persona: string | null;
  persona_override: string | null;
  account_type: string | null;
  tier: Tier | null;
  invite: 'yes' | 'review' | 'no' | null;
  segment: string | null;
  segment_evidence: string | null;
  benelux_presence: string | null;
  company_linkedin_url: string | null;
  warm_hook: string | null;
  linkedin_url: string | null;
  headline: string | null;
  role_since: string | null;
  recent_posts: RecentPost[] | null;
  icebreaker: string | null;
  photo_path: string | null;
  profile_flag: string | null;
  profile_note: string | null;
  invite_status: InviteStatus | null;
  meeting_status: MeetingStatus | null;
  meeting_at: string | null;
  next_step: string | null;
  notes: string | null;
  interest: Interest | null;
  owner: string | null;
  updated_at: string | null;
  updated_by: string | null;
  last_seen_list: number;
}

// The only columns the app may write (enforced by column grants in the database).
export type Editable = Pick<
  Delegate,
  'invite_status' | 'meeting_status' | 'meeting_at' | 'next_step' | 'notes' | 'interest' | 'owner'
>;

export interface AgendaItem {
  day: string;
  start: string;
  end: string;
  title: string;
  kind: 'networking' | 'booku' | 'intel';
}

/** LinkedIn invite templates per event. Placeholders: {first} {company} {company_local} {be_entity} {pain} {sender}. */
export interface Outreach {
  note_limit?: number;
  note_limit_free?: number;
  notes?: Record<string, string>;
  note_warm?: string;
  dm?: string;
  dm_warm?: string;
  pains?: Record<string, string>;
}

export interface EventInfo {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  location: string | null;
  booth: string | null;
  agenda: AgendaItem[] | null;
  briefing: string[] | null;
  outreach?: Outreach | null;
}

export interface TeamMember {
  email: string;
  name: string | null;
}

export interface Playbook {
  persona: string;
  label: string;
  role_in_deal: string | null;
  pains: string[];
  angle: string | null;
  questions: string[];
  proof: string | null;
  avoid: string[];
}

export interface Snapshot {
  event: EventInfo;
  delegates: Delegate[];
  playbook: Playbook[];
  /** Missing in snapshots cached by older app versions. */
  team?: TeamMember[];
  fetchedAt: string;
}
