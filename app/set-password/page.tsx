'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const MIN_PASSWORD_LENGTH = 8;

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const validateToken = useCallback(async () => {
    if (!token) {
      setChecking(false);
      setTokenValid(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/auth/reset-password?token=${encodeURIComponent(token)}`
      );
      const data = await res.json();
      setTokenValid(Boolean(data.valid));
      setEmail(data.email || '');
    } catch {
      setTokenValid(false);
    } finally {
      setChecking(false);
    }
  }, [token]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setDone(true);
        setTimeout(() => router.push('/sign-in?mode=signin'), 2500);
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center gap-2 text-slate-400 py-8">
        <Loader2 className="h-5 w-5 animate-spin" />
        Checking your link...
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="text-center py-4">
        <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">This link has expired</h2>
        <p className="text-slate-400 text-sm mb-6">
          Password links are single-use and time-limited. Request a fresh one and
          we&apos;ll email it right over.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block px-5 py-2.5 bg-sims-pink hover:bg-sims-pink/80 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Send me a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="h-10 w-10 text-sims-green mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">You&apos;re all set</h2>
        <p className="text-slate-400 text-sm mb-6">
          Your password is saved. Taking you to sign in...
        </p>
        <Link
          href="/sign-in?mode=signin"
          className="inline-block px-5 py-2.5 bg-sims-pink hover:bg-sims-pink/80 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Sign in now
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold text-white mb-1">Choose a password</h2>
      <p className="text-slate-400 text-sm mb-6">
        for <span className="text-white font-medium">{email}</span>
      </p>

      <label className="block text-sm font-medium text-slate-300 mb-2">
        New password
      </label>
      <div className="relative mb-4">
        <Lock
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sims-pink/50 transition-colors"
        />
      </div>

      <label className="block text-sm font-medium text-slate-300 mb-2">
        Confirm password
      </label>
      <div className="relative mb-5">
        <Lock
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type it again"
          className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sims-pink/50 transition-colors"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full px-5 py-2.5 bg-sims-pink hover:bg-sims-pink/80 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Saving...
          </>
        ) : (
          'Save password'
        )}
      </button>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-2 text-slate-400 py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading...
            </div>
          }
        >
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
