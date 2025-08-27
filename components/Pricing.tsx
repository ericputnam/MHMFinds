'use client'

import { motion } from 'framer-motion'
import { Check, Star, Crown, Zap } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for casual players getting started with mods',
    features: [
      '5 downloads per day',
      'Basic search and filtering',
      'Access to public mods',
      'Community ratings and reviews',
      'Basic collections',
      'Email support'
    ],
    cta: 'Get Started Free',
    popular: false,
    icon: Zap
  },
  {
    name: 'Premium',
    price: '$9.99',
    period: 'per month',
    description: 'For serious players who want unlimited access and advanced features',
    features: [
      'Unlimited downloads',
      'AI-powered recommendations',
      'Advanced search and filters',
      'Priority download speeds',
      'Unlimited collections',
      'Premium mod access',
      'Creator analytics',
      'Priority support',
      'Early access to new features'
    ],
    cta: 'Start Premium Trial',
    popular: true,
    icon: Star
  },
  {
    name: 'Creator Pro',
    price: '$19.99',
    period: 'per month',
    description: 'For creators who want to monetize and grow their audience',
    features: [
      'Everything in Premium',
      'Creator dashboard',
      'Advanced analytics',
      'Direct monetization',
      'Priority placement',
      'Creator tools and resources',
      'Dedicated support',
      'Revenue sharing',
      'Custom creator page',
      'Marketing tools'
    ],
    cta: 'Join Creator Pro',
    popular: false,
    icon: Crown
  }
]

export default function Pricing() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-dark-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Choose Your <span className="gradient-text">Plan</span>
          </h2>
          <p className="text-xl text-dark-600 max-w-3xl mx-auto">
            Start free and upgrade as you grow. All plans include our core features 
            with premium plans unlocking unlimited access and advanced capabilities.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`relative ${plan.popular ? 'scale-105' : ''}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-6 py-2 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}
              
              <div className={`card p-8 h-full ${plan.popular ? 'ring-2 ring-primary-500' : ''}`}>
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 mx-auto ${
                    plan.popular ? 'bg-primary-100 text-primary-600' :
                    plan.name === 'Free' ? 'bg-dark-100 text-dark-600' :
                    'bg-secondary-100 text-secondary-600'
                  }`}>
                    <plan.icon className="w-8 h-8" />
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-2 text-dark-900">
                    {plan.name}
                  </h3>
                  
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-dark-900">
                      {plan.price}
                    </span>
                    <span className="text-dark-600 ml-2">
                      {plan.period}
                    </span>
                  </div>
                  
                  <p className="text-dark-600">
                    {plan.description}
                  </p>
                </div>
                
                {/* Features */}
                <div className="mb-8">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-dark-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* CTA Button */}
                <button className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
                  plan.popular 
                    ? 'btn-primary' 
                    : plan.name === 'Free'
                    ? 'btn-outline'
                    : 'btn-secondary'
                }`}>
                  {plan.cta}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="bg-white rounded-2xl p-8 shadow-lg max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-4 text-dark-900">
              All Plans Include
            </h3>
            <p className="text-lg text-dark-600 mb-6">
              Core features that make ModVault the best Sims mod platform
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Access to 50K+ mods</span>
              </div>
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Community features</span>
              </div>
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Mobile responsive</span>
              </div>
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Regular updates</span>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-dark-200">
              <p className="text-sm text-dark-500">
                * 7-day free trial for Premium and Creator Pro plans. Cancel anytime.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
