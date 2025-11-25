'use client';

import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { Sparkles, Heart, Crown, Zap, CheckCircle2, Bell, Mail } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          source: 'sign-in',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubscribed(true);
        setEmail('');
      } else {
        setError(data.message || 'Failed to join waitlist. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Waitlist error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-mhm-dark via-[#1a1f3a] to-mhm-dark border-b border-white/5">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="container mx-auto px-4 py-20 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-sims-pink/10 border border-sims-pink/20 rounded-full px-6 py-2 mb-6">
                <Sparkles className="h-4 w-4 text-sims-pink" />
                <span className="text-sm font-semibold text-sims-pink">Coming Soon</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
                Member{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sims-pink via-purple-400 to-sims-blue animate-gradient">
                  Benefits
                </span>
              </h1>
              <p className="text-xl text-slate-400 leading-relaxed max-w-3xl mx-auto mb-8">
                We're building something special for our community. Sign up below to be notified when member accounts launch!
              </p>

              {/* Email Notification Form */}
              {!subscribed ? (
                <form onSubmit={handleNotifyMe} className="max-w-md mx-auto">
                  {error && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      disabled={isSubmitting}
                      className="flex-grow px-6 py-4 bg-white/5 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-sims-pink to-purple-600 text-white font-bold px-8 py-4 rounded-lg hover:scale-105 transition-transform duration-300 shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <Bell className="h-5 w-5" />
                      {isSubmitting ? 'Joining...' : 'Notify Me'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="max-w-md mx-auto bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex items-center gap-4">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <p className="text-slate-300">
                    Thanks! We'll notify you when member accounts are ready.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Membership Tiers */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">
              Planned Membership Tiers
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Free Tier */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                <div className="bg-gradient-to-br from-slate-500 to-slate-600 p-3 rounded-xl w-fit mb-4">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Free</h3>
                <p className="text-3xl font-extrabold mb-6 text-white">
                  $0<span className="text-lg text-slate-400 font-normal">/month</span>
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-green flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Browse all mods</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-green flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Basic search & filters</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-green flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Download free mods</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-green flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Community discussions</span>
                  </li>
                </ul>
              </div>

              {/* Premium Tier */}
              <div className="bg-gradient-to-br from-sims-pink/10 to-purple-600/10 border-2 border-sims-pink/30 rounded-2xl p-8 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <div className="bg-sims-pink text-white text-xs font-bold px-3 py-1 rounded-full">
                    POPULAR
                  </div>
                </div>
                <div className="bg-gradient-to-br from-sims-pink to-purple-600 p-3 rounded-xl w-fit mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Premium</h3>
                <p className="text-3xl font-extrabold mb-6 text-white">
                  $4.99<span className="text-lg text-slate-400 font-normal">/month</span>
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-pink flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Everything in Free</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-pink flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">AI-powered recommendations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-pink flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Unlimited favorites & collections</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-pink flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Early access to new mods</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-pink flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Priority support</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-pink flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Ad-free experience</span>
                  </li>
                </ul>
              </div>

              {/* Creator Tier */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                <div className="bg-gradient-to-br from-sims-blue to-cyan-600 p-3 rounded-xl w-fit mb-4">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Creator</h3>
                <p className="text-3xl font-extrabold mb-6 text-white">
                  $9.99<span className="text-lg text-slate-400 font-normal">/month</span>
                </p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-blue flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Everything in Premium</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-blue flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Upload & showcase your mods</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-blue flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Creator profile page</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-blue flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Analytics dashboard</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-blue flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Direct fan engagement</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-sims-blue flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">Verified creator badge</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="container mx-auto px-4 py-16 pb-24">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">
              What You'll Get as a Member
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Feature 1 */}
              <div className="bg-gradient-to-br from-sims-pink/10 to-purple-600/10 border border-sims-pink/20 rounded-2xl p-8">
                <div className="bg-gradient-to-br from-sims-pink to-purple-600 p-3 rounded-xl w-fit mb-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">AI-Powered Discovery</h3>
                <p className="text-slate-300 leading-relaxed">
                  Get personalized mod recommendations based on your preferences, favorites, and gaming style.
                  Our AI learns what you love and surfaces hidden gems you'll enjoy.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-gradient-to-br from-sims-blue/10 to-cyan-600/10 border border-sims-blue/20 rounded-2xl p-8">
                <div className="bg-gradient-to-br from-sims-blue to-cyan-600 p-3 rounded-xl w-fit mb-4">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Collections & Favorites</h3>
                <p className="text-slate-300 leading-relaxed">
                  Organize your favorite mods into custom collections. Share your curated lists with friends
                  and discover collections from other players.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-gradient-to-br from-sims-green/10 to-emerald-600/10 border border-sims-green/20 rounded-2xl p-8">
                <div className="bg-gradient-to-br from-sims-green to-emerald-600 p-3 rounded-xl w-fit mb-4">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Creator Support</h3>
                <p className="text-slate-300 leading-relaxed">
                  Support your favorite mod creators directly through the platform. Premium members help
                  fund the modding community and keep it thriving.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-700/10 border border-purple-500/20 rounded-2xl p-8">
                <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-3 rounded-xl w-fit mb-4">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Weekly Mod Digests</h3>
                <p className="text-slate-300 leading-relaxed">
                  Stay updated with curated weekly emails featuring the best new mods, trending content,
                  and creator spotlights tailored to your interests.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
