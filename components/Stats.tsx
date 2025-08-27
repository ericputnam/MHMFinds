'use client'

import { motion } from 'framer-motion'
import { 
  Download, 
  Users, 
  Star, 
  Zap,
  TrendingUp,
  Globe,
  Heart,
  Clock
} from 'lucide-react'

const stats = [
  {
    icon: Download,
    value: '2.5M+',
    label: 'Downloads',
    description: 'Mods downloaded by our community',
    color: 'primary'
  },
  {
    icon: Users,
    value: '100K+',
    label: 'Active Users',
    description: 'Players discovering mods daily',
    color: 'secondary'
  },
  {
    icon: Star,
    value: '4.9',
    label: 'User Rating',
    description: 'Average community satisfaction',
    color: 'accent'
  },
  {
    icon: Zap,
    value: '50K+',
    label: 'Mods Available',
    description: 'Curated content from creators',
    color: 'primary'
  },
  {
    icon: TrendingUp,
    value: '500+',
    label: 'Creators',
    description: 'Active mod creators',
    color: 'secondary'
  },
  {
    icon: Globe,
    value: '24/7',
    label: 'Updates',
    description: 'Real-time content aggregation',
    color: 'accent'
  },
  {
    icon: Heart,
    value: '95%',
    label: 'Satisfaction',
    description: 'User retention rate',
    color: 'primary'
  },
  {
    icon: Clock,
    value: '<1s',
    label: 'Search Speed',
    description: 'AI-powered instant results',
    color: 'secondary'
  }
]

export default function Stats() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 text-white">
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
            ModVault by the Numbers
          </h2>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            Our platform has grown into the definitive destination for Sims mods, 
            serving creators and players worldwide with cutting-edge technology.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center group"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 h-full hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 mx-auto group-hover:scale-110 transition-all duration-300 ${
                  stat.color === 'primary' ? 'bg-primary-400/20 text-primary-200' :
                  stat.color === 'secondary' ? 'bg-secondary-400/20 text-secondary-200' :
                  'bg-accent-400/20 text-accent-200'
                }`}>
                  <stat.icon className="w-8 h-8" />
                </div>
                
                <div className="text-4xl md:text-5xl font-bold mb-2 text-white">
                  {stat.value}
                </div>
                
                <div className="text-lg font-semibold mb-2 text-white">
                  {stat.label}
                </div>
                
                <p className="text-sm opacity-80 leading-relaxed">
                  {stat.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Growth Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-4">
              Exponential Growth
            </h3>
            <p className="text-lg opacity-90 mb-6">
              Our platform has seen consistent month-over-month growth in users, 
              content, and engagement since launch.
            </p>
            
            {/* Placeholder for growth chart */}
            <div className="bg-white/20 rounded-lg p-8 text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-60" />
              <p className="text-lg font-medium">
                Growth Analytics Dashboard
              </p>
              <p className="text-sm opacity-80">
                Coming soon: Real-time growth metrics and insights
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
