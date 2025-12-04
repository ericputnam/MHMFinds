'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { Sparkles, Crown, CheckCircle2, Download, X } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // Get initial mode from query parameter (e.g., ?mode=premium)
  const modeParam = searchParams?.get('mode') as 'signin' | 'signup' | 'premium' | null;
  const [mode, setMode] = useState<'signin' | 'signup' | 'premium'>(modeParam || 'signup');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedTier, setSelectedTier] = useState('ANNUAL');

  const pricingTiers: {
    [key: string]: {
      price: string;
      interval: string;
      perMonth?: string;
      save?: string;
      badge?: string;
      priceId: string | undefined;
    };
  } = {
    MONTHLY: {
      price: '$6.49',
      interval: '/month',
      priceId: process.env.NEXT_PUBLIC_STRIPE_CURIOUS_MONTHLY_PRICE_ID,
    },
    QUARTERLY: {
      price: '$12.49',
      interval: '/3 months',
      perMonth: '$4.16/mo',
      save: 'Save 36%',
      priceId: process.env.NEXT_PUBLIC_STRIPE_CURIOUS_QUARTERLY_PRICE_ID,
    },
    SEMI_ANNUAL: {
      price: '$16.49',
      interval: '/6 months',
      perMonth: '$2.75/mo',
      save: 'Save 58%',
      priceId: process.env.NEXT_PUBLIC_STRIPE_CURIOUS_SEMIANNUAL_PRICE_ID,
    },
    ANNUAL: {
      price: '$24.49',
      interval: '/year',
      perMonth: '$2.04/mo',
      save: 'Save 68%',
      badge: 'BEST VALUE',
      priceId: process.env.NEXT_PUBLIC_STRIPE_CURIOUS_ANNUAL_PRICE_ID,
    },
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        const redirect = searchParams?.get('redirect') || '/';
        router.push(redirect);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Create account via API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Failed to create account');
        setIsSubmitting(false);
        return;
      }

      // Auto sign in after signup
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created, but sign-in failed. Please try signing in.');
      } else {
        const redirect = searchParams?.get('redirect') || '/';
        router.push(redirect);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpgradeToPremium = async () => {
    // Check if user is authenticated
    if (status !== 'authenticated') {
      setError('Please sign in or create an account first to upgrade to premium');
      setMode('signup');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const tier = pricingTiers[selectedTier as keyof typeof pricingTiers];
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: tier.priceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start checkout');
        setIsSubmitting(false);
        return;
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      setError('Failed to start checkout. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-sims-pink/10 border border-sims-pink/20 rounded-full px-6 py-2 mb-6">
              <Crown className="h-4 w-4 text-sims-pink" />
              <span className="text-sm font-semibold text-sims-pink">
                {mode === 'premium' ? 'Upgrade to Premium' : 'Join MustHaveMods'}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
              {mode === 'premium' ? (
                <>Your Free Downloads <span className="text-transparent bg-clip-text bg-gradient-to-r from-sims-pink via-purple-400 to-sims-blue">Are Up!</span></>
              ) : (
                <>Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-sims-pink via-purple-400 to-sims-blue">Amazing</span> Sims Mods</>
              )}
            </h1>

            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              {mode === 'premium'
                ? 'Upgrade to Premium for unlimited downloads and ad-free browsing'
                : mode === 'signup'
                ? 'Create a free account to start discovering amazing Sims mods'
                : 'Welcome back! Sign in to continue discovering amazing mods'}
            </p>
          </div>

          <div className="flex justify-center">
            {/* Auth Form - shown in signup and signin modes */}
            {mode !== 'premium' && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setMode('signup')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                      mode === 'signup'
                        ? 'bg-gradient-to-r from-sims-pink to-purple-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => setMode('signin')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                      mode === 'signin'
                        ? 'bg-gradient-to-r from-sims-pink to-purple-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                </div>

                {error && (
                  <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
                  {mode === 'signup' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-sims-pink to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Free Account'}
                  </button>
                </form>
              </div>
            )}

            {/* Premium Pricing - only shown in dedicated premium mode */}
            {mode === 'premium' && (
              <div className="bg-gradient-to-br from-sims-pink/10 to-purple-600/10 border-2 border-sims-pink/30 rounded-2xl p-8 backdrop-blur-sm w-full max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Curious Simmer Premium</h2>
                  <p className="text-slate-400">Unlimited downloads • Ad-free browsing</p>
                </div>
                {mode === 'premium' && (
                  <button onClick={() => router.push('/')} className="text-slate-400 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Billing Options */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {Object.entries(pricingTiers).map(([key, tier]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTier(key)}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      selectedTier === key
                        ? 'border-sims-pink bg-sims-pink/20'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {tier.badge && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-sims-pink to-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                        {tier.badge}
                      </div>
                    )}
                    <div className="text-white font-bold text-lg">{tier.price}</div>
                    <div className="text-xs text-slate-400">{tier.interval}</div>
                    {tier.perMonth && (
                      <div className="text-xs text-sims-blue mt-1">{tier.perMonth}</div>
                    )}
                    {tier.save && (
                      <div className="text-xs text-sims-green mt-1">{tier.save}</div>
                    )}
                  </button>
                ))}
              </div>

              {/* Benefits */}
              <div className="bg-white/5 rounded-xl p-6 mb-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-sims-pink" />
                  Premium Benefits
                </h3>
                <ul className="space-y-3">
                  {[
                    'Unlimited mod downloads',
                    'Ad-free browsing experience',
                    'Priority customer support',
                    'Cancel anytime, no commitments'
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-sims-green flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {mode === 'premium' && (
                <>
                  {error && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleUpgradeToPremium}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-sims-pink to-purple-600 text-white font-bold py-4 px-6 rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Loading...' : 'Upgrade to Premium'}
                  </button>

                  <p className="text-center text-xs text-slate-500 mt-4">
                    Cancel anytime, no commitments
                  </p>
                </>
              )}
            </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
