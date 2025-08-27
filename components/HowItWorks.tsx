'use client'

import { motion } from 'framer-motion'
import { 
  Search, 
  Download, 
  Heart, 
  Share2, 
  Star,
  Users,
  TrendingUp,
  Zap
} from 'lucide-react'

const steps = [
  {
    number: '01',
    title: 'Discover',
    description: 'Browse our vast collection of mods with AI-powered recommendations and advanced filtering.',
    icon: Search,
    color: 'primary'
  },
  {
    number: '02',
    title: 'Download',
    description: 'Access mods instantly with our premium membership or limited daily downloads for free users.',
    icon: Download,
    color: 'secondary'
  },
  {
    number: '03',
    title: 'Organize',
    description: 'Create collections, rate mods, and build your personalized mod library.',
    icon: Heart,
    color: 'accent'
  },
  {
    number: '04',
    title: 'Share',
    description: 'Share your favorite mods with the community and discover new content from other players.',
    icon: Share2,
    color: 'primary'
  }
]

const creatorSteps = [
  {
    title: 'Creator Onboarding',
    description: 'Set up your creator profile and connect your existing platforms.',
    icon: Users,
    color: 'secondary'
  },
  {
    title: 'Content Upload',
    description: 'Upload your mods directly or sync from existing platforms automatically.',
    icon: Zap,
    color: 'accent'
  },
  {
    title: 'Analytics & Growth',
    description: 'Track performance, engage with your audience, and monetize your content.',
    icon: TrendingUp,
    color: 'primary'
  }
]

export default function HowItWorks() {
  return (
    <section className="py-20 bg-white">
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
            How <span className="gradient-text">ModVault</span> Works
          </h2>
          <p className="text-xl text-dark-600 max-w-3xl mx-auto">
            From discovery to organization, ModVault makes finding and managing Sims mods 
            simple, intuitive, and enjoyable.
          </p>
        </motion.div>

        {/* User Journey Steps */}
        <div className="mb-20">
          <h3 className="text-2xl font-bold text-center mb-12 text-dark-900">
            For Players
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-200 to-secondary-200 z-0" />
                )}
                
                <div className="relative z-10 text-center">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 mx-auto ${
                    step.color === 'primary' ? 'bg-primary-100 text-primary-600' :
                    step.color === 'secondary' ? 'bg-secondary-100 text-secondary-600' :
                    'bg-accent-100 text-accent-600'
                  }`}>
                    <step.icon className="w-10 h-10" />
                  </div>
                  
                  <div className="text-6xl font-bold text-dark-200 mb-4">
                    {step.number}
                  </div>
                  
                  <h4 className="text-xl font-semibold mb-3 text-dark-900">
                    {step.title}
                  </h4>
                  
                  <p className="text-dark-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Creator Journey */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center mb-12 text-dark-900">
            For Creators
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {creatorSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card p-8 text-center"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 mx-auto ${
                  step.color === 'primary' ? 'bg-primary-100 text-primary-600' :
                  step.color === 'secondary' ? 'bg-secondary-100 text-secondary-600' :
                  'bg-accent-100 text-accent-600'
                }`}>
                  <step.icon className="w-8 h-8" />
                </div>
                
                <h4 className="text-xl font-semibold mb-3 text-dark-900">
                  {step.title}
                </h4>
                
                <p className="text-dark-600 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Platform Integration */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-dark-50 to-dark-100 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-4 text-dark-900">
              Seamless Platform Integration
            </h3>
            <p className="text-lg text-dark-600 mb-6">
              ModVault automatically aggregates content from your favorite platforms, 
              so you never miss the latest mods and updates.
            </p>
            
            <div className="flex flex-wrap justify-center items-center gap-6">
              {['Patreon', 'CurseForge', 'Tumblr', 'The Sims Resource', 'ModTheSims'].map((platform, index) => (
                <div
                  key={index}
                  className="bg-white px-6 py-3 rounded-lg shadow-md text-dark-700 font-medium hover:shadow-lg transition-all duration-200"
                >
                  {platform}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
