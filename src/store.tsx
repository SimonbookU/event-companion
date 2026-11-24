import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { clear, createStore, get, set } from 'idb-keyval';
import { EVENT_ID, PHOTO_BUCKET } from './config';
import { supabase } from './supabase';
import type { Delegate, Editable, EventInfo, Playbook, Snapshot, TeamMember } from './types';

// Offline-first: the last snapshot, photos and unsynced edits live in IndexedDB, so the
// app keeps working on bad venue Wi-Fi. Edits sync as soon as the phone is back online.

const cache = createStore('booku-event-companion', 'cache');
const SNAPSHOT_KEY = `snapshot:${EVENT_ID}`;
const QUEUE_KEY = `queue:${EVENT_ID}`;

const DELEGATE_COLUMNS = [
  'id', 'company', 'company_group', 'first_name', 'last_name', 'title', 'city', 'country',
  'persona', 'persona_override', 'account_type', 'tier', 'invite', 'segment', 'segment_evidence',
  'benelux_presence', 'company_linkedin_url', 'warm_hook', 'linkedin_url', 'headline', 'role_since',
  'recent_posts', 'icebreaker', 'photo_path', 'profile_flag', 'profile_note', 'invite_status',
  'meeting_status', 'meeting_at', 'next_step', 'notes', 'interest', 'owner', 'updated_at',
  'updated_by', 'last_seen_list',
].join(', ');

type Patch = Partial<Editable>;
type Queue = Record<string, Patch>;
export type Status = 'loading' | 'signed-out' | 'no-access' | 'ready';
export type SaveResult = 'synced' | 'queued';

interface StoreValue {
  status: Status;
  session: Session | null;
  /** Signed-in email, lower case: owners are stored as team emails. */
  me: string;
  snapshot: Snapshot | null;
  photos: Record<string, string>;
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  error: string | null;
  dismissError: () => void;
  refresh: () => Promise<void>;
  save: (id: number, patch: Patch) => Promise<SaveResult>;
  signOut: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}

const isNetworkError = (message: string) => /fetch|network|load failed|offline/i.test(message);
const readQueue = async () => (await get<Queue>(QUEUE_KEY, cache)) ?? {};
const withQueue = (delegates: Delegate[], queue: Queue) =>
  delegates.map((d) => (queue[d.id] ? { ...d, ...queue[d.id] } : d));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const photoUrls = useRef<Record<string, string>>({});
  const lock = useRef<Promise<unknown>>(Promise.resolve());

  // Queue writes run one at a time, so a save and a background sync never race.
  const exclusive = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const run = lock.current.then(fn, fn);
    lock.current = run.catch(() => undefined);
    return run;
  }, []);

  const loadPhotos = useCallback(async (delegates: Delegate[]) => {
    const paths = [...new Set(delegates.map((d) => d.photo_path))].filter(
      (p): p is string => !!p && !photoUrls.current[p],
    );
    for (let i = 0; i < paths.length; i += 6) {
      await Promise.all(
        paths.slice(i, i + 6).map(async (path) => {
          let blob = await get<Blob>(`photo:${path}`, cache);
          if (!blob && navigator.onLine) {
            const { data } = await supabase.storage.from(PHOTO_BUCKET).download(path);
            if (data) {
              blob = data;
              await set(`photo:${path}`, data, cache);
            }
          }
          if (blob) photoUrls.current[path] = URL.createObjectURL(blob);
        }),
      );
      setPhotos({ ...photoUrls.current });
    }
  }, []);

  const flush = useCallback(
    () =>
      exclusive(async () => {
        const queue = await readQueue();
        if (navigator.onLine && Object.keys(queue).length) {
          setSyncing(true);
          for (const id of Object.keys(queue)) {
            const { error: e } = await supabase.from('event_delegates').update(queue[id]).eq('id', Number(id));
            if (e && isNetworkError(e.message)) break;
            if (e) setError(`A change could not be saved: ${e.message}`);
            delete queue[id];
          }
          await set(QUEUE_KEY, queue, cache);
          setSyncing(false);
        }
        setPendingCount(Object.keys(queue).length);
        return Object.keys(queue).length === 0;
      }),
    [exclusive],
  );

  const refresh = useCallback(async () => {
    if (!navigator.onLine) return;
    const [ev, dl, pb, tm] = await Promise.all([
      supabase
        .from('events')
        .select('id, name, starts_on, ends_on, location, booth, agenda, briefing, outreach')
        .eq('id', EVENT_ID)
        .maybeSingle(),
      supabase.from('event_delegates').select(DELEGATE_COLUMNS).eq('event_id', EVENT_ID).eq('removed_from_list', false),
      supabase.from('persona_playbook').select('persona, label, role_in_deal, pains, angle, questions, proof, avoid'),
      supabase.from('event_app_users').select('email, name'),
    ]);
    const failure = ev.error ?? dl.error ?? pb.error;
    if (failure) {
      if (!isNetworkError(failure.message)) setError(failure.message);
      return;
    }
    // Row-level security returns nothing to accounts that are not on the team list.
    if (!ev.data) {
      setStatus('no-access');
      return;
    }
    // The team list only labels owners, so a failed read keeps the last known list.
    const cachedTeam = (await get<Snapshot>(SNAPSHOT_KEY, cache))?.team ?? [];
    const next: Snapshot = {
      event: ev.data as EventInfo,
      delegates: withQueue(dl.data as unknown as Delegate[], await readQueue()),
      playbook: (pb.data ?? []) as Playbook[],
      team: tm.error ? cachedTeam : ((tm.data ?? []) as TeamMember[]),
      fetchedAt: new Date().toISOString(),
    };
    await set(SNAPSHOT_KEY, next, cache);
    setSnapshot(next);
    setStatus('ready');
    void loadPhotos(next.delegates);
  }, [loadPhotos]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cached, queue, { data }] = await Promise.all([
        get<Snapshot>(SNAPSHOT_KEY, cache),
        readQueue(),
        supabase.auth.getSession(),
      ]);
      if (cancelled) return;
      setPendingCount(Object.keys(queue).length);
      setSession(data.session);
      if (!data.session) {
        setStatus('signed-out');
        return;
      }
      if (cached) {
        setSnapshot(cached);
        setStatus('ready');
        void loadPhotos(cached.delegates);
      }
      await refresh();
      await flush();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN') {
        setStatus((prev) => (prev === 'signed-out' ? 'loading' : prev));
        // Supabase advises against awaiting other client calls inside this callback.
        setTimeout(() => void refresh().then(flush), 0);
      }
      if (event === 'SIGNED_OUT') setStatus('signed-out');
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [flush, loadPhotos, refresh]);

  useEffect(() => {
    const up = () => {
      setOnline(true);
      void flush().then(refresh);
    };
    const down = () => setOnline(false);
    // Pick up teammates' notes every few minutes while the app is open.
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 5 * 60 * 1000);
    addEventListener('online', up);
    addEventListener('offline', down);
    return () => {
      clearInterval(timer);
      removeEventListener('online', up);
      removeEventListener('offline', down);
    };
  }, [flush, refresh]);

  const save = useCallback(
    async (id: number, patch: Patch): Promise<SaveResult> => {
      await exclusive(async () => {
        const queue = await readQueue();
        queue[id] = { ...queue[id], ...patch };
        await set(QUEUE_KEY, queue, cache);
        setPendingCount(Object.keys(queue).length);
      });
      setSnapshot((prev) => {
        if (!prev) return prev;
        const next = { ...prev, delegates: prev.delegates.map((d) => (d.id === id ? { ...d, ...patch } : d)) };
        void set(SNAPSHOT_KEY, next, cache);
        return next;
      });
      return (await flush()) ? 'synced' : 'queued';
    },
    [exclusive, flush],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await clear(cache); // personal data does not stay on the phone after signing out
    Object.values(photoUrls.current).forEach((url) => URL.revokeObjectURL(url));
    photoUrls.current = {};
    setPhotos({});
    setSnapshot(null);
    setPendingCount(0);
    setStatus('signed-out');
  }, []);

  const value: StoreValue = {
    status,
    session,
    me: session?.user.email?.toLowerCase() ?? '',
    snapshot,
    photos,
    online,
    syncing,
    pendingCount,
    error,
    dismissError: () => setError(null),
    refresh,
    save,
    signOut,
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
