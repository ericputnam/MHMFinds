'use client';

import React from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { Sparkles, Shield, Users, Mail } from 'lucide-react';

export default function AboutPage() {
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
                <span className="text-sm font-semibold text-sims-pink">About MustHaveMods</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
                Your Trusted Source for{' '}
                <span className="text-white">
                  Game Mods
                </span>
              </h1>
              <p className="text-xl text-slate-400 leading-relaxed max-w-3xl mx-auto">
                Your ultimate destination for the best mods and custom content for life simulation games.
              </p>
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
              <h2 className="text-3xl font-bold mb-6 text-white">Our Mission</h2>
              <p className="text-lg text-slate-300 leading-relaxed mb-6">
                The platform covers various mod types, from gameplay adjustments to visual enhancements,
                positioning itself as a guide for both experienced modders and newcomers.
              </p>
              <p className="text-lg text-slate-300 leading-relaxed">
                We enhance gaming experiences through curated mod reviews and custom content discovery,
                making it easy for players to find exactly what they need to transform their gaming experience.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Quality Assurance */}
              <div className="bg-sims-pink/10 border border-sims-pink/20 rounded-2xl p-8 hover:scale-105 transition-transform duration-300">
                <div className="bg-sims-pink p-3 rounded-xl w-fit mb-4">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Quality Assurance</h3>
                <p className="text-slate-400 leading-relaxed">
                  Rigorous testing protocols for all recommended mods, focusing on compatibility and security.
                  We collaborate with trusted mod creators and maintain partnerships with anti-malware companies.
                </p>
              </div>

              {/* Expert Team */}
              <div className="bg-gradient-to-br from-sims-blue/10 to-cyan-600/10 border border-sims-blue/20 rounded-2xl p-8 hover:scale-105 transition-transform duration-300">
                <div className="bg-gradient-to-br from-sims-blue to-cyan-600 p-3 rounded-xl w-fit mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Expert Team</h3>
                <p className="text-slate-400 leading-relaxed">
                  Led by senior content writers and gaming specialists who have contributed to major gaming platforms.
                  Our team provides well-rounded, informed perspectives that highlight the beauty and complexity of gaming.
                </p>
              </div>

              {/* Community Focus */}
              <div className="bg-gradient-to-br from-sims-green/10 to-emerald-600/10 border border-sims-green/20 rounded-2xl p-8 hover:scale-105 transition-transform duration-300">
                <div className="bg-gradient-to-br from-sims-green to-emerald-600 p-3 rounded-xl w-fit mb-4">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Community Focus</h3>
                <p className="text-slate-400 leading-relaxed">
                  Beyond our website, we participate in gaming conventions and support educational modding initiatives,
                  helping to grow and nurture the modding community.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center text-white">Our Team</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-full bg-sims-pink flex items-center justify-center">
                    <Users className="h-12 w-12 text-white" />
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="text-2xl font-bold mb-2 text-white">Felister Moraa</h3>
                  <p className="text-sims-pink font-semibold mb-4">Senior Content Writer and Gaming Specialist</p>
                  <p className="text-slate-300 leading-relaxed mb-4">
                    Our featured expert combines gaming knowledge with writing talent. She has contributed to major
                    gaming platforms including Gamerant. Her background spans both published authorship and gaming journalism.
                  </p>
                  <p className="text-slate-400 leading-relaxed italic">
                    "Well-rounded, informed perspectives that highlight the beauty and complexity of the gaming world."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="container mx-auto px-4 py-16 pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="bg-sims-pink/10 border border-sims-pink/20 rounded-2xl p-8 md:p-12 text-center">
              <div className="bg-sims-pink p-4 rounded-xl w-fit mx-auto mb-6">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-white">Get In Touch</h2>
              <p className="text-slate-300 mb-6">
                Have questions or suggestions? We'd love to hear from you.
              </p>
              <a
                href="mailto:info@musthavemods.com"
                className="inline-block bg-sims-pink hover:bg-sims-pink/90 text-white font-bold px-8 py-3 rounded-full transition-all duration-300 shadow-lg"
              >
                info@musthavemods.com
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
