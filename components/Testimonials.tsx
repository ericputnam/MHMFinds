'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Sims Player',
    avatar: '/images/avatars/sarah.jpg',
    content: 'ModVault has completely transformed how I discover mods. The AI recommendations are spot-on, and I love how I can organize everything in one place.',
    rating: 5,
    platform: 'Patreon User'
  },
  {
    name: 'Marcus Rodriguez',
    role: 'Mod Creator',
    avatar: '/images/avatars/marcus.jpg',
    content: 'As a creator, ModVault has given me incredible exposure and analytics. My downloads have increased 300% since joining the platform.',
    rating: 5,
    platform: 'CurseForge Creator'
  },
  {
    name: 'Emma Thompson',
    role: 'Sims Enthusiast',
    avatar: '/images/avatars/emma.jpg',
    content: 'The search and filtering capabilities are amazing. I can find exactly what I need in seconds, and the quality of mods is consistently high.',
    rating: 5,
    platform: 'The Sims Resource User'
  },
  {
    name: 'Alex Kim',
    role: 'Content Creator',
    avatar: '/images/avatars/alex.jpg',
    content: 'ModVault\'s creator tools are incredible. I can track performance, engage with my audience, and monetize my content all in one place.',
    rating: 5,
    platform: 'Tumblr Creator'
  }
]

export default function Testimonials() {
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
            What Our Community Says
          </h2>
          <p className="text-xl text-dark-600 max-w-3xl mx-auto">
            Join thousands of satisfied players and creators who've transformed their 
            Sims experience with ModVault.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="card p-8 relative"
            >
              {/* Quote Icon */}
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary-200" />
              
              {/* Rating */}
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current text-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              {/* Content */}
              <p className="text-lg text-dark-700 mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>
              
              {/* Author */}
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full mr-4 flex items-center justify-center text-white font-semibold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-dark-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-dark-600">
                    {testimonial.role} • {testimonial.platform}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Community Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-4 text-dark-900">
              Join Our Growing Community
            </h3>
            <p className="text-lg text-dark-600 mb-6">
              Be part of the most vibrant Sims mod community in the world.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">98%</div>
                <div className="text-dark-600">User Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary-600 mb-2">15min</div>
                <div className="text-dark-600">Avg. Session Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent-600 mb-2">85%</div>
                <div className="text-dark-600">Return Rate</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
