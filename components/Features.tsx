'use client'

import { motion } from 'framer-motion'
import { 
  Brain, 
  Search, 
  Users, 
  Zap, 
  Shield, 
  TrendingUp,
  Sparkles,
  Globe
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Discovery',
    description: 'Find the perfect mods with intelligent recommendations based on your preferences and gameplay style.',
    color: 'primary'
  },
  {
    icon: Search,
    title: 'Advanced Search & Filters',
    description: 'Multi-dimensional filtering with faceted search, tags, and AI-powered categorization.',
    color: 'secondary'
  },
  {
    icon: Users,
    title: 'Creator Hub',
    description: 'Dedicated spaces for creators to showcase work, monetize content, and grow their audience.',
    color: 'accent'
  },
  {
    icon: Zap,
    title: 'Real-Time Updates',
    description: 'Automated content aggregation from multiple platforms with near real-time updates.',
    color: 'primary'
  },
  {
    icon: Shield,
    title: 'Quality Assurance',
    description: 'Automated verification, duplicate detection, and community-driven quality ratings.',
    color: 'secondary'
  },
  {
    icon: TrendingUp,
    title: 'Smart Analytics',
    description: 'Track mod performance, user engagement, and discover trending content.',
    color: 'accent'
  },
  {
    icon: Sparkles,
    title: 'Personalized Experience',
    description: 'AI-curated feeds and recommendations tailored to your unique preferences.',
    color: 'primary'
  },
  {
    icon: Globe,
    title: 'Multi-Platform Support',
    description: 'Access mods from Patreon, CurseForge, Tumblr, and more in one unified platform.',
    color: 'secondary'
  }
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
}

export default function Features() {
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
            Why Choose <span className="gradient-text">ModVault</span>?
          </h2>
          <p className="text-xl text-dark-600 max-w-3xl mx-auto">
            We're revolutionizing Sims mod discovery with cutting-edge AI technology, 
            comprehensive content aggregation, and an unparalleled user experience.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group"
            >
              <div className="card p-6 h-full text-center group-hover:scale-105 transition-all duration-300">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 group-hover:scale-110 transition-all duration-300 ${
                  feature.color === 'primary' ? 'bg-primary-100 text-primary-600' :
                  feature.color === 'secondary' ? 'bg-secondary-100 text-secondary-600' :
                  'bg-accent-100 text-accent-600'
                }`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                
                <h3 className="text-xl font-semibold mb-3 text-dark-900">
                  {feature.title}
                </h3>
                
                <p className="text-dark-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Ready to Transform Your Sims Experience?
            </h3>
            <p className="text-lg mb-6 opacity-90">
              Join thousands of players who've already discovered their perfect mods with ModVault.
            </p>
            <button className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105">
              Get Started Today
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
