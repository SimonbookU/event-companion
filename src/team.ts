import { useStore } from './store';
import type { TeamMember } from './types';

/** "jane.doe@example.com" -> "Jane", for owners missing from the team list. */
const nameFromEmail = (email: string) => {
  const local = email.split('@')[0].split(/[._-]/)[0] ?? email;
  return local.charAt(0).toUpperCase() + local.slice(1);
};

/** Owner names and "is this me?" checks. Owners are stored as team emails. */
export function useTeam() {
  const { snapshot, me } = useStore();
  const team: TeamMember[] = [...(snapshot?.team ?? [])].sort((a, b) =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email),
  );
  const nameOf = (email: string | null | undefined): string => {
    if (!email) return '';
    const lower = email.toLowerCase();
    return team.find((t) => t.email.toLowerCase() === lower)?.name ?? nameFromEmail(lower);
  };
  const isMe = (email: string | null | undefined) => !!email && !!me && email.toLowerCase() === me;
  return { me, team, nameOf, isMe, myName: nameOf(me) };
}
