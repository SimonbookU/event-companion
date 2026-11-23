import { useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { supabase } from '../supabase';

const inputClass =
  'mt-1.5 w-full rounded-2xl border border-brand-neutral/15 bg-surface px-4 py-3 text-base font-normal outline-none focus:border-brand-violet';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) {
      setError(authError.message === 'Invalid login credentials' ? 'Wrong email or password.' : authError.message);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-blue px-6 py-10">
      <img src="brand/logo-white.png" alt="bookU" className="mb-10 h-9 w-auto" />
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-xl">
        <h1 className="text-xl font-semibold text-brand-blue">Event Companion</h1>
        <p className="mt-1 text-sm text-brand-neutral/70">Sign in with the account Simon set up for you.</p>
        <label className="mt-6 block text-sm font-semibold">
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        {error && <p className="mt-4 rounded-2xl bg-brand-pink/10 px-4 py-3 text-sm text-brand-pink">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-full bg-brand-orange py-3 font-semibold text-white active:opacity-80 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 max-w-sm text-center text-xs text-white/60">
        Internal bookU tool. Delegate data is confidential and is deleted 30 days after the event.
      </p>
    </div>
  );
}

export function NoAccess() {
  const { session, signOut } = useStore();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-blue px-6 text-center text-white">
      <img src="brand/logo-white.png" alt="bookU" className="mb-8 h-9 w-auto" />
      <p className="max-w-sm">
        You are signed in as <strong>{session?.user.email}</strong>, but this account is not on the team list for this
        event yet. Ask Simon to add you.
      </p>
      <button type="button" onClick={() => void signOut()} className="mt-6 rounded-full bg-white/15 px-6 py-2.5 font-semibold">
        Sign out
      </button>
    </div>
  );
}

export function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-blue">
      <img src="brand/logo-white.png" alt="bookU" className="h-9 w-auto animate-pulse" />
    </div>
  );
}
