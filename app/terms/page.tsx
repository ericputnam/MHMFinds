'use client';

import React from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-mhm-dark via-[#1a1f3a] to-mhm-dark border-b border-white/5">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="container mx-auto px-4 py-16 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-sims-blue/10 border border-sims-blue/20 rounded-full px-6 py-2 mb-6">
                <FileText className="h-4 w-4 text-sims-blue" />
                <span className="text-sm font-semibold text-sims-blue">Legal</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight text-white">
                Terms & Conditions
              </h1>
              <p className="text-slate-400">Last Updated: March 21, 2022</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-16 pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-sm space-y-8">

              {/* Overview */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Overview</h2>
                <p className="text-slate-300 leading-relaxed">
                  Must Have Mods operates https://musthavemods.com/. By using the site, you agree to these binding terms and conditions.
                </p>
              </section>

              {/* Eligibility */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Eligibility</h2>
                <p className="text-slate-300 leading-relaxed">
                  "This Site is intended for individuals who are 18 years of age or older." Users confirm they meet legal age requirements when accessing the platform.
                </p>
              </section>

              {/* Content Ownership */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Content Ownership</h2>
                <p className="text-slate-300 leading-relaxed">
                  Must Have Mods retains all intellectual property rights to site content. Users cannot reproduce, redistribute, or publish any materials without written consent from olivia@musthavemods.com.
                </p>
              </section>

              {/* Linking Policy */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Linking Policy</h2>
                <p className="text-slate-300 leading-relaxed">
                  External links to the site are permitted only when users clearly credit the company, include hyperlinks, avoid framing, maintain legal content on their own sites, and do not misrepresent endorsement.
                </p>
              </section>

              {/* Information Disclaimers */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Information Disclaimers</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  "The Content of this Site is meant for informational purposes only." The company disclaims responsibility for inaccuracies and provides no warranties regarding site performance or reliability.
                </p>
              </section>

              {/* User-Submitted Content */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">User-Submitted Content</h2>
                <p className="text-slate-300 leading-relaxed">
                  Users grant Must Have Mods a "non-exclusive, fully paid and royalty-free, worldwide, perpetual license" to modify and distribute any content submitted, while remaining solely liable for copyright infringement.
                </p>
              </section>

              {/* Comments & Data */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Comments & Data</h2>
                <p className="text-slate-300 leading-relaxed">
                  Comment submissions are publicly visible. The site collects IP addresses and browser information for spam detection per the privacy policy.
                </p>
              </section>

              {/* Third-Party Content */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Third-Party Content</h2>
                <p className="text-slate-300 leading-relaxed">
                  The company bears no responsibility for embedded content from external sites that may track user interactions independently.
                </p>
              </section>

              {/* Affiliate Relationships */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Affiliate Relationships</h2>
                <p className="text-slate-300 leading-relaxed">
                  Must Have Mods participates in Amazon Associates and discloses affiliate links, though editorial opinions remain uninfluenced by partnerships.
                </p>
              </section>

              {/* Dispute Resolution */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Dispute Resolution</h2>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
                  <p className="text-slate-300 leading-relaxed">
                    "THESE TERMS AND CONDITIONS CONTAIN A BINDING ARBITRATION CLAUSE AND CLASS ACTION WAIVER." Disputes proceed to binding arbitration in Montgomery County under Ohio law, with parties waiving jury trial rights.
                  </p>
                </div>
              </section>

              {/* Termination */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Termination</h2>
                <p className="text-slate-300 leading-relaxed">
                  The company reserves the right to terminate user access for Terms violations without notice.
                </p>
              </section>

              {/* Contact */}
              <section className="pt-8 border-t border-white/10">
                <p className="text-slate-400 text-sm">
                  For questions about these Terms & Conditions, please contact:{' '}
                  <a href="mailto:olivia@musthavemods.com" className="text-sims-blue hover:text-sims-pink transition-colors">
                    olivia@musthavemods.com
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
