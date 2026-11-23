import { AppHeader } from '../shell';
import { useStore } from '../store';
import { dayLabel, eventDays, nextAgendaItem } from '../time';
import type { AgendaItem } from '../types';
import { Bullets, Section } from '../ui';

const KIND_STYLE: Record<AgendaItem['kind'], string> = {
  networking: 'bg-surface',
  booku: 'bg-brand-orange/12 font-semibold',
  intel: 'bg-brand-pink/8',
};
const KIND_LABEL: Record<AgendaItem['kind'], string> = {
  networking: 'Networking',
  booku: 'bookU',
  intel: 'Intel',
};

export function Agenda() {
  const { snapshot, session, pendingCount, signOut } = useStore();
  const ev = snapshot?.event;
  const agenda = ev?.agenda ?? [];
  const next = nextAgendaItem(agenda);

  function onSignOut() {
    if (pendingCount && !confirm(`${pendingCount} change(s) have not synced yet and will be lost. Sign out anyway?`)) return;
    void signOut();
  }

  return (
    <>
      <AppHeader title="Agenda" />
      <main className="space-y-3 px-4 pt-4">
        {!!ev?.briefing?.length && (
          <Section title="Briefing">
            <Bullets items={ev.briefing} />
          </Section>
        )}

        {eventDays(agenda).map((day) => (
          <Section key={day} title={dayLabel(day)}>
            <ol className="space-y-2">
              {agenda
                .filter((a) => a.day === day)
                .map((a) => (
                  <li
                    key={`${a.start}-${a.title}`}
                    className={`flex gap-3 rounded-2xl px-3 py-2.5 text-[15px] ${KIND_STYLE[a.kind]} ${
                      a === next?.item ? 'ring-2 ring-brand-orange' : ''
                    }`}
                  >
                    <span className="w-[6.5rem] shrink-0 tabular-nums">
                      {a.start}–{a.end}
                    </span>
                    <span className="min-w-0 flex-1">
                      {a.title}
                      {a.kind !== 'networking' && (
                        <span className="ml-2 text-[11px] font-semibold uppercase text-brand-neutral/50">{KIND_LABEL[a.kind]}</span>
                      )}
                    </span>
                  </li>
                ))}
            </ol>
          </Section>
        ))}

        <Section title="Account">
          <p className="text-sm">
            Signed in as <strong>{session?.user.email}</strong>
          </p>
          <p className="mt-1 text-xs text-brand-neutral/55">
            Times are London time. Signing out removes the saved data and photos from this phone.
          </p>
          <button type="button" onClick={onSignOut} className="mt-4 rounded-full bg-surface px-5 py-2 text-sm font-semibold">
            Sign out
          </button>
        </Section>
      </main>
    </>
  );
}
