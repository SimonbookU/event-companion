import { useEffect, useState } from 'react';

// Hash routes keep the phone's back button working and need no server rewrites on static hosting.
export type Route =
  | { name: 'home' }
  | { name: 'company'; key: string }
  | { name: 'person'; id: number }
  | { name: 'coffees' }
  | { name: 'agenda' };

export const href = {
  home: '#/',
  company: (key: string) => `#/c/${encodeURIComponent(key)}`,
  person: (id: number) => `#/p/${id}`,
  coffees: '#/coffees',
  agenda: '#/agenda',
};

export function parseHash(hash: string): Route {
  const [, kind, arg] = hash.replace(/^#\/?/, '/').split('/');
  if (kind === 'c' && arg) return { name: 'company', key: decodeURIComponent(arg) };
  if (kind === 'p' && arg && /^\d+$/.test(arg)) return { name: 'person', id: Number(arg) };
  if (kind === 'coffees') return { name: 'coffees' };
  if (kind === 'agenda') return { name: 'agenda' };
  return { name: 'home' };
}

// Scroll position per route, so going back to a long list lands where you left it.
const scrollPositions = new Map<string, number>();

export function useRoute(): Route {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    let current = location.hash;
    const onChange = () => {
      scrollPositions.set(current, scrollY);
      current = location.hash;
      setHash(current);
      requestAnimationFrame(() => scrollTo(0, scrollPositions.get(current) ?? 0));
    };
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return parseHash(hash);
}
