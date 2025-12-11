'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CheckCircle2, Crown, Download, Sparkles, ArrowRight } from 'lucide-react';

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const success = searchParams?.get('success');
  const canceled = searchParams?.get('canceled');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
      return;
    }

    if (status === 'authenticated') {
      fetchSubscription();
    }
  }, [status, router]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription/check-limit', {
        method: 'POST',
      });
      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-mhm-dark text-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sims-pink mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Message */}
          {success && (
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-sims-pink rounded-full mb-6">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                Welcome to <span className="text-white">Premium</span>!
              </h1>

              <p className="text-lg text-slate-400 mb-8">
                Your subscription has been activated successfully. Enjoy unlimited downloads!
              </p>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm mb-8">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <Crown className="w-6 h-6 text-sims-pink" />
                  <h2 className="text-2xl font-bold text-white">Premium Benefits</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { icon: Download, text: 'Unlimited mod downloads' },
                    { icon: Sparkles, text: 'Ad-free browsing experience' },
                    { icon: CheckCircle2, text: 'Priority customer support' },
                    { icon: Crown, text: 'Cancel anytime' },
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-300">
                      <benefit.icon className="w-5 h-5 text-sims-green flex-shrink-0" />
                      <span>{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/"
                  className="inline-flex items-center justify-center gap-2 bg-sims-pink hover:bg-sims-pink/90 text-white font-bold py-3 px-8 rounded-xl transition-all"
                >
                  Start Downloading
                  <ArrowRight className="w-5 h-5" />
                </a>

                <a
                  href="/account/subscription/manage"
                  className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 px-8 rounded-xl transition-all"
                >
                  Manage Subscription
                </a>
              </div>
            </div>
          )}

          {/* Canceled Message */}
          {canceled && (
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                Checkout Canceled
              </h1>

              <p className="text-lg text-slate-400 mb-8">
                You canceled the checkout. No charges were made.
              </p>

              <div className="flex gap-4 justify-center">
                <a
                  href="/"
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 px-8 rounded-xl transition-all"
                >
                  Back to Home
                </a>

                <a
                  href="/sign-in?mode=premium"
                  className="bg-sims-pink hover:bg-sims-pink/90 text-white font-bold py-3 px-8 rounded-xl transition-all"
                >
                  Try Again
                </a>
              </div>
            </div>
          )}

          {/* Current Subscription Status */}
          {!success && !canceled && subscription && (
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
                Your Subscription
              </h1>

              {subscription.isPremium ? (
                <div className="bg-sims-pink/10 border-2 border-sims-pink/30 rounded-2xl p-8 backdrop-blur-sm">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Crown className="w-8 h-8 text-sims-pink" />
                    <h2 className="text-3xl font-bold text-white">Premium Active</h2>
                  </div>

                  <p className="text-slate-400 mb-6">
                    You have unlimited downloads and ad-free browsing!
                  </p>

                  <a
                    href="/account/subscription/manage"
                    className="inline-block bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 px-8 rounded-xl transition-all"
                  >
                    Manage Subscription
                  </a>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                  <h2 className="text-2xl font-bold text-white mb-4">Free Plan</h2>

                  <p className="text-slate-400 mb-6">
                    You have {subscription.clicksRemaining} of 5 downloads remaining
                  </p>

                  <a
                    href="/sign-in?mode=premium"
                    className="inline-block bg-sims-pink hover:bg-sims-pink/90 text-white font-bold py-3 px-8 rounded-xl transition-all"
                  >
                    Upgrade to Premium
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
