'use client'

import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, Users, Star } from 'lucide-react'

export default function CTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 text-white">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          {/* Main CTA */}
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to Transform Your
            <br />
            <span className="text-yellow-300">Sims Experience</span>?
          </h2>
          
          <p className="text-xl md:text-2xl mb-8 opacity-90 leading-relaxed">
            Join 100,000+ players who've already discovered their perfect mods with ModVault. 
            Start your journey today with our AI-powered discovery platform.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5" />
              Start Exploring Now
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-4 px-8 rounded-lg transition-all duration-200 flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Join as Creator
            </button>
          </div>
          
          {/* Trust Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">50K+</div>
              <div className="opacity-80">Mods Available</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">4.9</div>
              <div className="opacity-80 flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-current text-yellow-300" />
                Rating
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">100K+</div>
              <div className="opacity-80">Happy Users</div>
            </div>
          </div>
          
          {/* Social Proof */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-4">
              What Players Are Saying
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="bg-white/20 rounded-lg p-4">
                <p className="mb-3">"ModVault has completely changed how I play Sims. The AI recommendations are incredible!"</p>
                <div className="text-sm opacity-80">- Sarah M., Premium Member</div>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="mb-3">"As a creator, I've seen my downloads increase 300% since joining ModVault."</p>
                <div className="text-sm opacity-80">- Marcus R., Creator Pro</div>
              </div>
            </div>
          </div>
          
          {/* Final CTA */}
          <div className="mt-12">
            <p className="text-lg mb-6 opacity-90">
              Start your free trial today. No credit card required.
            </p>
            <button className="bg-yellow-400 text-dark-900 hover:bg-yellow-300 font-bold py-4 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 text-lg">
              Get Started Free →
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
