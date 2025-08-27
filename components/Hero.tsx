'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Sparkles, Download, Users, Star } from 'lucide-react'

export default function Hero() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery)
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50" />
      <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-10" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 animate-float">
        <div className="w-20 h-20 bg-primary-200 rounded-full opacity-60" />
      </div>
      <div className="absolute top-40 right-20 animate-float" style={{ animationDelay: '2s' }}>
        <div className="w-16 h-16 bg-secondary-200 rounded-full opacity-60" />
      </div>
      <div className="absolute bottom-40 left-20 animate-float" style={{ animationDelay: '4s' }}>
        <div className="w-12 h-12 bg-accent-200 rounded-full opacity-60" />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="gradient-text">ModVault</span>
            <br />
            <span className="text-dark-900">The Ultimate Sims</span>
            <br />
            <span className="text-dark-900">Mod Discovery Platform</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-dark-600 max-w-4xl mx-auto leading-relaxed">
            Discover, download, and manage Sims mods with AI-powered recommendations. 
            Join thousands of creators and players in the definitive destination for custom content.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-12"
        >
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-dark-400 w-6 h-6" />
              <input
                type="text"
                placeholder="Search for mods, creators, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-4 text-lg border-2 border-dark-200 rounded-full focus:ring-4 focus:ring-primary-500 focus:border-transparent transition-all duration-200 shadow-lg"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-full transition-all duration-200 hover:scale-105"
              >
                Search
              </button>
            </div>
          </form>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
        >
          <button className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Start Exploring
          </button>
          <button className="btn-outline text-lg px-8 py-4 flex items-center gap-2">
            <Download className="w-5 h-5" />
            Join as Creator
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">50K+</div>
            <div className="text-dark-600">Mods Available</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-secondary-600 mb-2">500+</div>
            <div className="text-dark-600">Active Creators</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-accent-600 mb-2">100K+</div>
            <div className="text-dark-600">Happy Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">4.9</div>
            <div className="text-dark-600 flex items-center justify-center gap-1">
              <Star className="w-4 h-4 fill-current text-yellow-400" />
              Rating
            </div>
          </div>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-16 pt-8 border-t border-dark-200"
        >
          <p className="text-dark-500 mb-4">Trusted by creators and players worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="text-dark-400 font-semibold">Patreon</div>
            <div className="text-dark-400 font-semibold">CurseForge</div>
            <div className="text-dark-400 font-semibold">The Sims Resource</div>
            <div className="text-dark-400 font-semibold">ModTheSims</div>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-dark-300 rounded-full flex justify-center">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1 h-3 bg-dark-400 rounded-full mt-2"
          />
        </div>
      </motion.div>
    </section>
  )
}
