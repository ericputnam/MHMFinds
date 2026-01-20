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
          <p className="text-slate-400 mb-8">Last updated: January 19, 2026</p>

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
              <h2 className="text-2xl font-bold text-white mb-4">Mediavine Programmatic Advertising (Ver 1.1)</h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                The Website works with Mediavine to manage third-party interest-based advertising appearing on the Website. Mediavine serves content and advertisements when you visit the Website, which may use first and third-party cookies. A cookie is a small text file which is sent to your computer or mobile device (referred to in this policy as a "device") by the web server so that a website can remember some information about your browsing activity on the Website.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                First party cookies are created by the website that you are visiting. A third-party cookie is frequently used in behavioral advertising and analytics and is created by a domain other than the website you are visiting. Third-party cookies, tags, pixels, beacons and other similar technologies (collectively, "Tags") may be placed on the Website to monitor interaction with advertising content and to target and optimize advertising. Each internet browser has functionality so that you can block both first and third-party cookies and clear your browser's cache. The "help" feature of the menu bar on most browsers will tell you how to stop accepting new cookies, how to receive notification of new cookies, how to disable existing cookies and how to clear your browser's cache. For more information about cookies and how to disable them, you can consult the information at{' '}
                <a href="https://www.allaboutcookies.org/manage-cookies/" target="_blank" rel="noreferrer noopener nofollow" className="text-sims-pink hover:underline">All About Cookies</a>.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                Without cookies you may not be able to take full advantage of the Website content and features. Please note that rejecting cookies does not mean that you will no longer see ads when you visit our Site. In the event you opt-out, you will still see non-personalized advertisements on the Website.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                The Website collects the following data using a cookie when serving personalized ads:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-2 mb-4 ml-4">
                <li>IP Address</li>
                <li>Operating System type</li>
                <li>Operating System version</li>
                <li>Device Type</li>
                <li>Language of the website</li>
                <li>Web browser type</li>
                <li>Email (in hashed form)</li>
              </ul>
              <p className="text-slate-300 leading-relaxed mb-4">
                Mediavine Partners (companies listed below with whom Mediavine shares data) may also use this data to link to other end user information the partner has independently collected to deliver targeted advertisements. Mediavine Partners may also separately collect data about end users from other sources, such as advertising IDs or pixels, and link that data to data collected from Mediavine publishers in order to provide interest-based advertising across your online experience, including devices, browsers and apps. This data includes usage data, cookie information, device information, information about interactions between users and advertisements and websites, geolocation data, traffic data, and information about a visitor's referral source to a particular website. Mediavine Partners may also create unique IDs to create audience segments, which are used to provide targeted advertising.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                If you would like more information about this practice and to know your choices to opt-in or opt-out of this data collection, please visit{' '}
                <a href="https://thenai.org/opt-out/" target="_blank" rel="noreferrer noopener nofollow" className="text-sims-pink hover:underline">National Advertising Initiative opt out page</a>. You may also visit{' '}
                <a href="http://optout.aboutads.info/#/" target="_blank" rel="noreferrer noopener nofollow" className="text-sims-pink hover:underline">Digital Advertising Alliance website</a> and{' '}
                <a href="http://optout.networkadvertising.org/#" target="_blank" rel="noreferrer noopener nofollow" className="text-sims-pink hover:underline">Network Advertising Initiative website</a> to learn more information about interest-based advertising. You may download the AppChoices app at{' '}
                <a href="https://youradchoices.com/appchoices" target="_blank" rel="noreferrer noopener nofollow" className="text-sims-pink hover:underline">Digital Advertising Alliance's AppChoices app</a> to opt out in connection with mobile apps, or use the platform controls on your mobile device to opt out.
              </p>
              <p className="text-slate-300 leading-relaxed mb-4">
                For specific information about Mediavine Partners, the data each collects and their data collection and privacy policies, please visit{' '}
                <a href="https://www.mediavine.com/ad-partners/" target="_blank" rel="noreferrer noopener nofollow" className="text-sims-pink hover:underline">Mediavine Partners</a>.
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
