'use client';

import React from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-mhm-dark via-[#1a1f3a] to-mhm-dark border-b border-white/5">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="container mx-auto px-4 py-16 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-sims-green/10 border border-sims-green/20 rounded-full px-6 py-2 mb-6">
                <Shield className="h-4 w-4 text-sims-green" />
                <span className="text-sm font-semibold text-sims-green">Privacy</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight text-white">
                Privacy Policy
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
                <p className="text-slate-300 leading-relaxed mb-4">
                  Must Have Mods operates musthavemods.com and is committed to protecting user privacy. The site collects personal data and uses it according to this policy.
                </p>
                <div className="bg-sims-green/10 border border-sims-green/20 rounded-lg p-4">
                  <p className="text-slate-300 text-sm">
                    <strong className="text-white">Owner and Data Controller:</strong><br />
                    Must Have Mods<br />
                    Address: 4275 Umberoak Ct., Apt B, Centerville, OH, 45459<br />
                    Contact: olivia@musthavemods.com
                  </p>
                </div>
              </section>

              {/* Information Collection */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Information Collection</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  The site may request personally identifiable information including name, email, cookies, usage data, and passwords.
                </p>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Uses of Personal Information:</h3>
                  <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                    <li>Newsletter distribution</li>
                    <li>Contact management and messaging</li>
                    <li>Content optimization for your device</li>
                    <li>Providing requested information and services</li>
                    <li>Contract fulfillment</li>
                    <li>Social media interaction</li>
                    <li>Registration and authentication</li>
                    <li>Third-party service access</li>
                    <li>Infrastructure monitoring</li>
                    <li>Remarketing and behavioral targeting</li>
                    <li>User database management</li>
                  </ul>
                </div>
              </section>

              {/* Data Types Collected */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Data Types Collected</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Log Data</h3>
                    <p className="text-slate-300 leading-relaxed">
                      Includes IP addresses, browser type and version, visited pages, visit timestamps, and time spent on pages.
                      The site uses third-party services like Google Analytics.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Cookies</h3>
                    <p className="text-slate-300 leading-relaxed">
                      Text files stored on your device to improve your experience. The site requests consent for non-essential cookies upon first visit.
                    </p>
                  </div>
                </div>
              </section>

              {/* Data Storage and Security */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Data Storage and Security</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  Submitted personal data is stored securely according to this policy. The site implements:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                  <li>Regular security scanning</li>
                  <li>Malware monitoring</li>
                  <li>Secured networks with limited access</li>
                  <li>SSL encryption for sensitive information</li>
                </ul>
              </section>

              {/* Legal Basis for Processing */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Legal Basis for Processing</h2>
                <p className="text-slate-300 leading-relaxed">
                  Personal data processing occurs when users provide consent, contracts require it, legal obligations demand it,
                  public interest is served, or legitimate interests are pursued.
                </p>
              </section>

              {/* Data Retention */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Data Retention</h2>
                <p className="text-slate-300 leading-relaxed">
                  Personal data is retained as long as necessary for its original purpose, including contract performance,
                  legitimate interests, or legal compliance.
                </p>
              </section>

              {/* Third-Party Disclosure */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Third-Party Disclosure</h2>
                <p className="text-slate-300 leading-relaxed">
                  The site does not sell or transfer personal information without notice, except to hosting partners and
                  service providers under confidentiality agreements.
                </p>
              </section>

              {/* Children's Privacy */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Children's Privacy (COPPA)</h2>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-slate-300 leading-relaxed">
                    The site is intended for users 18 and older and does not knowingly collect information from children under 13.
                  </p>
                </div>
              </section>

              {/* Mediavine Advertising */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Mediavine Advertising</h2>
                <p className="text-slate-300 leading-relaxed">
                  The site works with Mediavine for programmatic advertising. Collected data includes IP addresses, operating system details,
                  device type, language, browser type, and hashed email addresses used for targeted ads.
                </p>
              </section>

              {/* Payment Processing */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Payment Processing (Stripe)</h2>
                <div className="bg-sims-blue/10 border border-sims-blue/20 rounded-lg p-6 space-y-3">
                  <p className="text-slate-300 leading-relaxed">
                    Premium subscription payments are processed by Stripe, Inc. We do not store your complete credit card information on our servers.
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    When you subscribe, Stripe collects and processes:
                  </p>
                  <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                    <li>Payment card information</li>
                    <li>Billing address</li>
                    <li>Email address</li>
                    <li>Transaction history</li>
                  </ul>
                  <p className="text-slate-300 leading-relaxed">
                    Stripe's use of your personal information is governed by their Privacy Policy:{' '}
                    <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-sims-blue hover:text-sims-pink transition-colors underline">
                      https://stripe.com/privacy
                    </a>
                  </p>
                </div>
              </section>

              {/* User Rights */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">User Rights</h2>
                <p className="text-slate-300 leading-relaxed">
                  Users may opt out of personalized advertising through the National Advertising Initiative, Digital Advertising Alliance,
                  or Network Advertising Initiative websites.
                </p>
              </section>

              {/* Policy Changes */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">Policy Changes</h2>
                <p className="text-slate-300 leading-relaxed">
                  This policy became effective March 21, 2022. The site reserves the right to update it anytime, with material changes
                  communicated via email or prominent website notice.
                </p>
              </section>

              {/* Contact */}
              <section className="pt-8 border-t border-white/10">
                <p className="text-slate-400 text-sm">
                  For questions about this Privacy Policy, please contact:{' '}
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
