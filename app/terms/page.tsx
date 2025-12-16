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
              <p className="text-slate-400">Last Updated: November 24, 2025</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-16 pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-sm space-y-8">

              {/* Introduction */}
              <section>
                <p className="text-slate-300 leading-relaxed">
                  By accessing or using MustHaveMods.com ("the Site"), you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree, do not use the Site.
                </p>
              </section>

              {/* 1. Eligibility */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">1. Eligibility</h2>
                <p className="text-slate-300 leading-relaxed">
                  This Site is intended for individuals 18 years of age or older. By using the Site, you confirm you meet the legal age requirements of your jurisdiction.
                </p>
              </section>

              {/* 2. Intellectual Property Rights */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">2. Intellectual Property Rights</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  All content on the Site—including text, images, videos, graphics, guides, and branding—is the exclusive property of Must Have Mods.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Users may not copy, reproduce, redistribute, or publish any materials without prior written permission from{' '}
                  <a href="mailto:olivia@musthavemods.com" className="text-sims-blue hover:text-sims-pink transition-colors">
                    olivia@musthavemods.com
                  </a>.
                </p>
              </section>

              {/* 3. User-Submitted Content */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">3. User-Submitted Content</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  By submitting comments or content, you grant Must Have Mods a non-exclusive, perpetual, irrevocable, worldwide, royalty-free license to use, modify, reproduce, distribute, and display such content.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  You remain solely responsible for ensuring your submissions do not infringe the rights of third parties.
                </p>
              </section>

              {/* 4. Public Comments & Data Collection */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">4. Public Comments & Data Collection</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                  <li>Comments posted on the Site are publicly visible.</li>
                  <li>The Site collects IP addresses and browser metadata for spam detection as described in our Privacy Policy.</li>
                </ul>
              </section>

              {/* 5. Linking Policy */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">5. Linking Policy</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  You may link to the Site only if you:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                  <li>Provide proper credit</li>
                  <li>Include a direct hyperlink</li>
                  <li>Do not frame Site content</li>
                  <li>Do not imply endorsement</li>
                  <li>Comply with all laws when publishing your linked content</li>
                </ul>
              </section>

              {/* 6. Third-Party Content & External Websites */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">6. Third-Party Content & External Websites</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  The Site contains links and embedded content from third-party websites.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Must Have Mods is not responsible for the content, privacy practices, or data collection of any third-party site.
                </p>
              </section>

              {/* 7. Affiliate Disclosure */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">7. Affiliate Disclosure</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  Must Have Mods participates in affiliate programs including Amazon Associates. We may earn commissions on qualifying purchases.
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Affiliate relationships do not influence editorial content.
                </p>
              </section>

              {/* 8. Information Disclaimer */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">8. Information Disclaimer (No Guarantees)</h2>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 space-y-3">
                  <p className="text-slate-300 leading-relaxed">
                    All content on the Site is provided for informational purposes only.
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    We make no warranties regarding accuracy, completeness, reliability, or results.
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    Guides and instructions may not work on all devices or game versions.
                  </p>
                </div>
              </section>

              {/* 9. No Professional Advice */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">9. No Professional Advice</h2>
                <p className="text-slate-300 leading-relaxed">
                  Content does not constitute professional, technical, or legal advice. You are responsible for evaluating and implementing modifications at your own discretion.
                </p>
              </section>

              {/* 10. Limitation of Liability */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">10. Limitation of Liability</h2>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                  <p className="text-slate-300 leading-relaxed mb-4">
                    To the maximum extent permitted by law, Must Have Mods shall not be liable for any damages of any kind, including but not limited to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                    <li>Data loss</li>
                    <li>Corrupted game saves</li>
                    <li>Device malfunction</li>
                    <li>Lost profits</li>
                    <li>Malware from third-party links</li>
                    <li>Gameplay issues caused by mods</li>
                  </ul>
                  <p className="text-slate-300 leading-relaxed mt-4 font-semibold">
                    Your use of the Site is at your own risk.
                  </p>
                </div>
              </section>

              {/* 11. Indemnification */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">11. Indemnification</h2>
                <p className="text-slate-300 leading-relaxed">
                  You agree to indemnify and hold Must Have Mods and its owners harmless from any claims, liabilities, damages, or expenses arising from your use of the Site or violation of these Terms.
                </p>
              </section>

              {/* 11A. Premium Subscription Terms */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">11A. Premium Subscription Terms</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Billing</h3>
                    <p className="text-slate-300 leading-relaxed">
                      Premium subscriptions are billed monthly at $6.49 USD per month. By subscribing, you authorize Must Have Mods to charge your payment method on a recurring basis until you cancel.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Automatic Renewal</h3>
                    <p className="text-slate-300 leading-relaxed">
                      Your subscription will automatically renew each month unless you cancel before the renewal date. You will be charged at the then-current rate.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Premium Benefits</h3>
                    <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                      <li>Unlimited mod downloads</li>
                      <li>Ad-free browsing experience</li>
                      <li>Early access to new features</li>
                      <li>Priority support</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 11B. Cancellation Policy */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">11B. Cancellation Policy</h2>
                <div className="bg-sims-blue/10 border border-sims-blue/20 rounded-lg p-6 space-y-3">
                  <p className="text-slate-300 leading-relaxed">
                    You may cancel your Premium subscription at any time by clicking the "Premium" badge in your account and selecting "Cancel Subscription" in the Stripe Customer Portal.
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    Cancellations take effect at the end of your current billing period. You will retain Premium access until that date.
                  </p>
                  <p className="text-slate-300 leading-relaxed font-semibold">
                    No partial refunds will be provided for unused portions of the billing period.
                  </p>
                </div>
              </section>

              {/* 11C. Refund Policy */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">11C. Refund Policy</h2>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6 space-y-3">
                  <p className="text-slate-300 leading-relaxed font-semibold">
                    All sales are final. We do not offer refunds for Premium subscriptions.
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    However, we may consider refund requests on a case-by-case basis for the following circumstances:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-slate-300 ml-4">
                    <li>Accidental duplicate charges</li>
                    <li>Billing errors on our part</li>
                    <li>Technical issues preventing access to Premium features</li>
                  </ul>
                  <p className="text-slate-300 leading-relaxed">
                    To request a refund, contact{' '}
                    <a href="mailto:olivia@musthavemods.com" className="text-sims-blue hover:text-sims-pink transition-colors">
                      olivia@musthavemods.com
                    </a>{' '}
                    within 7 days of the charge with your order details.
                  </p>
                </div>
              </section>

              {/* 12. Arbitration & Class Action Waiver */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">12. Arbitration & Class Action Waiver</h2>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6 space-y-3">
                  <p className="text-slate-300 leading-relaxed font-semibold uppercase text-sm">
                    Binding Arbitration Clause
                  </p>
                  <p className="text-slate-300 leading-relaxed">
                    Any dispute arising out of or relating to these Terms shall be resolved through binding arbitration in Montgomery County, Ohio, under Ohio law.
                  </p>
                  <p className="text-slate-300 leading-relaxed font-semibold">
                    You waive any right to a jury trial or participation in a class action.
                  </p>
                </div>
              </section>

              {/* 13. Governing Law */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">13. Governing Law</h2>
                <p className="text-slate-300 leading-relaxed">
                  These Terms are governed by the laws of the State of Ohio, without regard to conflict-of-laws principles.
                </p>
              </section>

              {/* 14. Termination */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">14. Termination</h2>
                <p className="text-slate-300 leading-relaxed">
                  We reserve the right to suspend or terminate access to the Site at our sole discretion, without notice, for any violation of these Terms.
                </p>
              </section>

              {/* 15. Modifications to Terms */}
              <section>
                <h2 className="text-2xl font-bold mb-4 text-white">15. Modifications to Terms</h2>
                <p className="text-slate-300 leading-relaxed">
                  Must Have Mods may update or modify these Terms at any time. Continued use of the Site constitutes acceptance of updated Terms.
                </p>
              </section>

              {/* 16. Contact Information */}
              <section className="pt-8 border-t border-white/10">
                <h2 className="text-2xl font-bold mb-4 text-white">16. Contact Information</h2>
                <p className="text-slate-300 leading-relaxed">
                  For questions regarding these Terms, contact:{' '}
                  <a href="mailto:olivia@musthavemods.com" className="text-sims-blue hover:text-sims-pink transition-colors">
                    olivia@musthavemods.com
                  </a>
                </p>
              </section>

              {/* Acceptance Notice */}
              <section className="pt-8 border-t border-white/10">
                <div className="bg-sims-blue/10 border border-sims-blue/20 rounded-lg p-6">
                  <p className="text-slate-300 leading-relaxed text-center">
                    By using MustHaveMods.com, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
