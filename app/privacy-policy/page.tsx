import React from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';

export const metadata = {
  title: 'Privacy Policy - MustHaveMods',
  description: 'Privacy Policy for MustHaveMods - Learn how we collect, use, and protect your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-400 mb-8">Last updated: May 23, 2022</p>

          <div className="prose prose-invert prose-slate max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Must Have Mods operates <a href="https://musthavemods.com/" className="text-sims-pink hover:underline">https://musthavemods.com/</a> and is committed to protecting user privacy.
              </p>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                <p className="text-slate-300 font-semibold mb-2">Contact Information:</p>
                <ul className="text-slate-400 space-y-1">
                  <li>Address: 609 E Main St Ste CC #1043 Purcellville, VA 20132</li>
                  <li>Email: <a href="mailto:olivia@musthavemods.com" className="text-sims-pink hover:underline">olivia@musthavemods.com</a></li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Data Collection & Use</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                The site collects personally identifiable information including names, emails, cookies, and usage data to:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4 ml-4">
                <li>Send newsletters</li>
                <li>Manage contacts and messages</li>
                <li>Present content effectively</li>
                <li>Provide requested information or services</li>
                <li>Fulfill contractual obligations</li>
                <li>Enable social network interactions</li>
                <li>Support registration and authentication</li>
                <li>Facilitate remarketing and behavioral targeting</li>
                <li>Monitor infrastructure and manage databases</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Log Data & Cookies</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                The site collects browser information such as IP address, browser type, visited pages, and time spent on pages through services like Google Analytics. Cookies store anonymous usage information to improve user experience. Refer to the "Cookie Policy" for detailed cookie information and control options.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Data Storage & Security</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Personal data transfers are permitted upon submission. The site uses SSL encryption, regular malware scanning, and secured networks with limited access. However, no internet transmission method is completely secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Legal Basis for Processing</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Data processing occurs when users consent, contracts require it, legal obligations exist, public interest tasks apply, or legitimate business interests are present.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Data Retention</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Data retention depends on collection purpose: contractual data persists until completion, legitimate interest data remains as needed, and consent-based data continues until withdrawal or longer if legally required.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Third-Party Disclosure</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Personal information is not sold or traded. However, hosting partners and service providers assisting operations may access data under confidentiality agreements. Non-personal visitor information may be shared for marketing purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Special Provisions</h2>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">CalOPPA</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                Anonymous site visits are permitted; the site does not honor "do not track" signals.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">COPPA</h3>
              <p className="text-slate-300 leading-relaxed mb-4">
                The site targets users 18+ and does not knowingly collect data from children under 13. Parents/guardians can request deletion of child information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Policy Changes</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Modifications take effect immediately upon posting. Material changes trigger email notification or prominent website notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Mediavine Advertising</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                The site uses Mediavine for programmatic advertising, collecting IP address, operating system details, device type, language, browser type, and hashed email for personalized ads. Users can opt out via National Advertising Initiative or Digital Advertising Alliance websites.
              </p>
            </section>

            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 mt-8">
              <p className="text-slate-400 text-sm">
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:olivia@musthavemods.com" className="text-sims-pink hover:underline">
                  olivia@musthavemods.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
