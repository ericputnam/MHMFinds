'use client'

import { motion } from 'framer-motion'
import { 
  Heart, 
  Twitter, 
  Facebook, 
  Instagram, 
  Youtube,
  Github,
  Mail,
  MapPin,
  Phone
} from 'lucide-react'

const footerLinks = {
  platform: [
    { name: 'Browse Mods', href: '#' },
    { name: 'Search & Filter', href: '#' },
    { name: 'Collections', href: '#' },
    { name: 'AI Recommendations', href: '#' },
    { name: 'Download Manager', href: '#' }
  ],
  creators: [
    { name: 'Creator Hub', href: '#' },
    { name: 'Upload Mods', href: '#' },
    { name: 'Analytics', href: '#' },
    { name: 'Monetization', href: '#' },
    { name: 'Creator Resources', href: '#' }
  ],
  company: [
    { name: 'About Us', href: '#' },
    { name: 'Careers', href: '#' },
    { name: 'Press', href: '#' },
    { name: 'Partners', href: '#' },
    { name: 'Contact', href: '#' }
  ],
  support: [
    { name: 'Help Center', href: '#' },
    { name: 'Community', href: '#' },
    { name: 'Bug Reports', href: '#' },
    { name: 'Feature Requests', href: '#' },
    { name: 'Status Page', href: '#' }
  ]
}

const socialLinks = [
  { name: 'Twitter', icon: Twitter, href: '#' },
  { name: 'Facebook', icon: Facebook, href: '#' },
  { name: 'Instagram', icon: Instagram, href: '#' },
  { name: 'YouTube', icon: Youtube, href: '#' },
  { name: 'GitHub', icon: Github, href: '#' }
]

export default function Footer() {
  return (
    <footer className="bg-dark-900 text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h3 className="text-2xl font-bold gradient-text mb-2">
                ModVault
              </h3>
              <p className="text-dark-300 leading-relaxed">
                The ultimate Sims mod discovery platform powered by AI. 
                Join thousands of creators and players in the definitive 
                destination for custom content.
              </p>
            </div>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center text-dark-300">
                <Mail className="w-4 h-4 mr-3" />
                <span>hello@modvault.com</span>
              </div>
              <div className="flex items-center text-dark-300">
                <Phone className="w-4 h-4 mr-3" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center text-dark-300">
                <MapPin className="w-4 h-4 mr-3" />
                <span>San Francisco, CA</span>
              </div>
            </div>
          </div>
          
          {/* Platform Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Platform</h4>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    className="text-dark-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Creator Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Creators</h4>
            <ul className="space-y-2">
              {footerLinks.creators.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    className="text-dark-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    className="text-dark-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Support Links */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href} 
                    className="text-dark-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Newsletter Signup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-dark-800 rounded-2xl p-8 mb-12"
        >
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-2">
              Stay Updated
            </h3>
            <p className="text-dark-300 mb-6">
              Get the latest mod releases, creator updates, and platform news delivered to your inbox.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-dark-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button className="btn-primary px-6 py-3">
                Subscribe
              </button>
            </div>
          </div>
        </motion.div>
        
        {/* Bottom Footer */}
        <div className="border-t border-dark-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            {/* Copyright */}
            <div className="text-dark-300 text-sm mb-4 md:mb-0">
              © 2024 ModVault. All rights reserved. Made with{' '}
              <Heart className="inline w-4 h-4 text-red-500" /> for the Sims community.
            </div>
            
            {/* Social Links */}
            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="text-dark-400 hover:text-white transition-colors duration-200"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
          
          {/* Legal Links */}
          <div className="flex flex-wrap justify-center md:justify-start mt-6 space-x-6 text-sm text-dark-400">
            <a href="#" className="hover:text-white transition-colors duration-200">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors duration-200">
              Terms of Service
            </a>
            <a href="#" className="hover:text-white transition-colors duration-200">
              Cookie Policy
            </a>
            <a href="#" className="hover:text-white transition-colors duration-200">
              DMCA
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
