'use client';

import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';

interface NewsletterSignupProps {
  source?: string;
}

/**
 * Email capture form backed by /api/waitlist.
 *
 * ~64% of traffic comes from Pinterest — a single-channel dependency.
 * Capturing emails builds an owned audience we can bring back directly
 * if that referral source ever dips.
 */
export function NewsletterSignup({ source = 'footer' }: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
        setErrorMessage(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <CheckCircle2 size={18} className="text-sims-green flex-shrink-0" />
        <span>You&apos;re on the list — the best new finds are headed your way.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Mail
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            aria-label="Email address"
            className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sims-pink/50 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="px-5 py-2.5 bg-sims-pink hover:bg-sims-pink/80 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap inline-flex items-center justify-center gap-2"
        >
          {status === 'submitting' ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Joining...
            </>
          ) : (
            'Get the best finds'
          )}
        </button>
      </div>
      {status === 'error' && (
        <p className="text-xs text-red-400 mt-2">{errorMessage}</p>
      )}
    </form>
  );
}

export default NewsletterSignup;
