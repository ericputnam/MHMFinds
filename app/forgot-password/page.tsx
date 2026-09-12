'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setStatus('sent');
      } else {
        setMessage(data.message || 'Something went wrong. Please try again.');
        setStatus('idle');
      }
    } catch {
      setMessage('Something went wrong. Please try again.');
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8">
        {status === 'sent' ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-10 w-10 text-sims-green mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">Check your inbox</h1>
            <p className="text-slate-400 text-sm mb-6">{message}</p>
            <Link
              href="/sign-in?mode=signin"
              className="inline-flex items-center gap-2 text-sm text-sims-pink hover:text-sims-pink/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h1 className="text-xl font-bold text-white mb-1">
              Forgot your password?
            </h1>
            <p className="text-slate-400 text-sm mb-6">
              Enter your email and we&apos;ll send you a link to choose a new one.
            </p>

            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <div className="relative mb-5">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sims-pink/50 transition-colors"
              />
            </div>

            {message && <p className="text-sm text-red-400 mb-4">{message}</p>}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full px-5 py-2.5 bg-sims-pink hover:bg-sims-pink/80 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2"
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </button>

            <div className="mt-6 text-center">
              <Link
                href="/sign-in?mode=signin"
                className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
