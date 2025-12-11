'use client';

import { useState } from 'react';
import { X, Crown, Check } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export function UpgradeModal({ onClose }: Props) {
  const [selectedInterval, setSelectedInterval] = useState('ANNUAL');
  const [isLoading, setIsLoading] = useState(false);

  interface Plan {
    price: string;
    interval: string;
    priceId: string | undefined;
    perMonth?: string;
    save?: string;
    badge?: string;
    popular?: boolean;
  }

  const plans: Record<string, Plan> = {
    MONTHLY: {
      price: '$6.49',
      interval: '/month',
      priceId: process.env.NEXT_PUBLIC_STRIPE_CURIOUS_MONTHLY_PRICE_ID
    },
    QUARTERLY: {
      price: '$12.49',
      interval: '/3 months',
      perMonth: '$4.16/mo',
      save: '36% off',
      priceId: process.env.NEXT_PUBLIC_STRIPE_CURIOUS_QUARTERLY_PRICE_ID
    },
    SEMI_ANNUAL: {
      price: '$16.49',
      interval: '/6 months',
      perMonth: '$2.75/mo',
      save: '58% off',
      priceId: process.env.NEXT_PUBLIC_STRIPE_CURIOUS_SEMIANNUAL_PRICE_ID
    },
    ANNUAL: {
      price: '$24.49',
      interval: '/year',
      perMonth: '$2.04/mo',
      save: '60% off',
      badge: '+ 7 days free!',
      priceId: process.env.NEXT_PUBLIC_STRIPE_CURIOUS_ANNUAL_PRICE_ID,
      popular: true
    }
  };

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plans[selectedInterval as keyof typeof plans].priceId
        })
      });
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Upgrade error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0F141F] w-full max-w-2xl rounded-3xl border border-white/10 p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <Crown className="w-16 h-16 mx-auto mb-4 text-sims-pink" />
          <h2 className="text-3xl font-bold text-white mb-2">
            You've Reached Your Free Downloads!
          </h2>
          <p className="text-slate-400">
            Upgrade to Curious Simmer Premium for unlimited access
          </p>
        </div>

        {/* Billing Interval Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {Object.entries(plans).map(([key, plan]) => (
            <button
              key={key}
              onClick={() => setSelectedInterval(key)}
              className={`relative p-4 rounded-xl border-2 transition-all ${selectedInterval === key
                  ? 'border-sims-pink bg-sims-pink/10'
                  : 'border-white/10 hover:border-white/20'
                }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-sims-pink text-white text-xs px-3 py-1 rounded-full font-bold">
                  BEST VALUE
                </div>
              )}
              <div className="text-white font-bold text-lg">{plan.price}</div>
              <div className="text-sm text-slate-400">{plan.interval}</div>
              {plan.perMonth && (
                <div className="text-xs text-sims-blue mt-1">{plan.perMonth}</div>
              )}
              {plan.save && (
                <div className="text-xs text-sims-green mt-1">{plan.save}</div>
              )}
              {plan.badge && (
                <div className="text-xs text-sims-pink mt-1 font-semibold">{plan.badge}</div>
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
                <Check className="w-5 h-5 text-sims-green flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full bg-sims-pink hover:bg-sims-pink/90 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {isLoading ? 'Loading...' : 'Upgrade to Premium'}
        </button>

        <button
          onClick={onClose}
          className="w-full text-slate-400 hover:text-white transition-colors text-sm"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
