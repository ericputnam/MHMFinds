'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Crown, Settings, CreditCard, AlertCircle } from 'lucide-react';

export default function ManageSubscriptionPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [status, router]);

  const handleManageSubscription = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to open subscription portal');
        setLoading(false);
        return;
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (status === 'loading') {
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
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-sims-pink rounded-full mb-6">
              <Settings className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
              Manage <span className="text-white">Subscription</span>
            </h1>

            <p className="text-lg text-slate-400">
              Update your payment method, view invoices, or cancel your subscription
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            <div className="space-y-6">
              {/* Subscription Management */}
              <div>
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-sims-pink" />
                  Subscription Management
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                  Access the Stripe Customer Portal to manage your subscription, update payment methods, and view billing history.
                </p>

                <button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="w-full bg-sims-pink hover:bg-sims-pink/90 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Opening Portal...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Open Customer Portal
                    </>
                  )}
                </button>
              </div>

              {/* What you can do */}
              <div className="pt-6 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white mb-3">In the Customer Portal, you can:</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sims-pink"></div>
                    Update your payment method
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sims-pink"></div>
                    View and download invoices
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sims-pink"></div>
                    Change your billing plan
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-sims-pink"></div>
                    Cancel your subscription
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <a
              href="/"
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
