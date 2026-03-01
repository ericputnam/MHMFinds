/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Menu, 
  X, 
  ChevronDown, 
  Sparkles, 
  TrendingUp, 
  Download, 
  Heart,
  ArrowRight,
  Gamepad2,
  Layers,
  Zap
} from 'lucide-react';

const CATEGORIES = [
  { name: 'Games', items: ['Sims 4', 'Sims 3', 'Sims 2'] },
  { name: 'Mods', items: ['Gameplay', 'Script Mods', 'Fixes'] },
  { name: 'Custom Content', items: ['Hair', 'Clothing', 'Furniture', 'Makeup'] },
  { name: 'Challenges', items: ['Legacy', '100 Baby', 'Rags to Riches'] },
  { name: 'ModVault', items: ['Premium', 'Exclusive'] },
];

const POSTS = [
  {
    id: 1,
    title: "Top 60+ Sims 4 Maxis Match Hair Styles for Every Sim Personality (2026 Update)",
    category: "Sims 4 CC",
    image: "https://musthavemods.com/wp-content/uploads/2023/06/sims-4-maxis-match-hair-styles.jpg",
    date: "Feb 20, 2026",
    author: "Lyla Sims",
    likes: 1240,
  },
  {
    id: 2,
    title: "40+ Best Sims 4 Romance Mods for Couples: Kissing, Love & Intimate Moments",
    category: "Sims 4 Mods",
    image: "https://musthavemods.com/wp-content/uploads/2023/05/sims-4-romance-mods.jpg",
    date: "Feb 18, 2026",
    author: "SulSul Sam",
    likes: 856,
  },
  {
    id: 3,
    title: "15 Best Sims 4 Edges CC and Babyhairs to Perfect Your Sim's Hairline",
    category: "Sims 4 CC",
    image: "https://musthavemods.com/wp-content/uploads/2023/04/sims-4-edges-cc.jpg",
    date: "Feb 15, 2026",
    author: "Bella Goth",
    likes: 2103,
  },
  {
    id: 4,
    title: "The Ultimate Guide to Realistic Skin Overlays in 2026",
    category: "Custom Content",
    image: "https://musthavemods.com/wp-content/uploads/2023/02/sims-4-skin-overlays.jpg",
    date: "Feb 12, 2026",
    author: "Lyla Sims",
    likes: 542,
  },
  {
    id: 5,
    title: "How to Install Script Mods: A Beginner's Step-by-Step Guide",
    category: "Tutorials",
    image: "https://musthavemods.com/wp-content/uploads/2023/01/install-sims-4-mods.jpg",
    date: "Feb 10, 2026",
    author: "Mod Master",
    likes: 3210,
  },
  {
    id: 6,
    title: "Top 10 Build Mode Tools You Didn't Know You Needed",
    category: "Build Mode",
    image: "https://musthavemods.com/wp-content/uploads/2022/12/sims-4-build-mode-mods.jpg",
    date: "Feb 08, 2026",
    author: "Architect Alex",
    likes: 1890,
  }
];

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen selection:bg-brand-pink selection:text-white">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-pink/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-purple/10 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b-0 mt-4 mx-6 rounded-2xl">
        <div className="max-w-[1800px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-pink flex items-center justify-center shadow-lg shadow-brand-pink/20">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <span className="font-display text-2xl font-black tracking-tighter">
                MUSTHAVE<span className="text-brand-pink">MODS</span>
              </span>
            </motion.div>

            <div className="hidden xl:flex items-center gap-8">
              {CATEGORIES.map((cat) => (
                <div key={cat.name} className="group relative py-4">
                  <button className="flex items-center gap-1 text-sm font-bold text-slate-400 group-hover:text-white transition-colors uppercase tracking-wider">
                    {cat.name}
                    <ChevronDown className="w-4 h-4 opacity-50 group-hover:rotate-180 transition-transform" />
                  </button>
                  <div className="absolute top-full left-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200">
                    <div className="glass rounded-xl p-2 min-w-[200px] shadow-2xl">
                      {cat.items.map(item => (
                        <button key={item} className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-brand-pink/10 rounded-lg transition-colors">
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center glass rounded-full px-6 py-2.5 focus-within:ring-2 ring-brand-pink/50 transition-all">
              <Search className="w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search mods..." 
                className="bg-transparent border-none focus:ring-0 text-sm ml-3 w-64 lg:w-80"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-brand-pink hover:bg-brand-pink/90 text-white px-8 py-3 rounded-full text-sm font-black shadow-lg shadow-brand-pink/40 transition-all uppercase tracking-widest"
            >
              Patreon Membership
            </motion.button>
            <button 
              className="xl:hidden p-2 text-slate-400 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1800px] mx-auto px-8 pt-12 pb-24">
        {/* Hero Section */}
        <section className="relative mb-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink/10 border border-brand-pink/20 text-brand-pink text-xs font-black uppercase tracking-[0.2em] mb-8">
                <Zap className="w-3.5 h-3.5" /> 2026 Collection Live
              </div>
              <h1 className="font-display text-7xl lg:text-[10rem] font-black leading-[0.85] tracking-tighter mb-10">
                YOUR #1 <br />
                <span className="text-gradient">SOURCE FOR</span> <br />
                SIMS 4 MODS
              </h1>
              <p className="text-xl text-slate-400 max-w-xl mb-12 leading-relaxed">
                Discover the best Sims 4 mods, custom content, and expansions to transform your gameplay. Explore top-rated downloads, tutorials, and tips at MustHaveMods.com.
              </p>
              <div className="flex flex-wrap gap-6">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  className="bg-brand-pink text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 shadow-2xl shadow-brand-pink/30 uppercase tracking-widest text-sm"
                >
                  Free Mod & CC Finder <ArrowRight className="w-5 h-5" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  className="glass px-10 py-5 rounded-2xl font-black hover:bg-white/10 transition-colors uppercase tracking-widest text-sm"
                >
                  Browse Categories
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative aspect-[4/3] lg:aspect-square"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-pink to-brand-purple rounded-[4rem] blur-[100px] opacity-30 animate-pulse" />
              <div className="relative h-full w-full rounded-[4rem] overflow-hidden border border-white/10 shadow-2xl">
                <img 
                  src="https://musthavemods.com/wp-content/uploads/2023/06/sims-4-maxis-match-hair-styles.jpg" 
                  alt="Featured Sim" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://picsum.photos/seed/sims-hair/1200/1200";
                  }}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <div className="absolute bottom-12 left-12 right-12">
                  <div className="glass p-6 rounded-3xl flex items-center justify-between backdrop-blur-2xl">
                    <div>
                      <p className="text-xs font-black text-brand-pink uppercase tracking-[0.2em] mb-2">Featured CC</p>
                      <p className="text-2xl font-display font-black">Cyberpunk Hair Collection</p>
                    </div>
                    <button className="w-14 h-14 rounded-2xl bg-brand-pink text-white flex items-center justify-center hover:bg-brand-pink/90 transition-colors shadow-lg shadow-brand-pink/20">
                      <Download className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats / Quick Links */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-24">
          {[
            { label: 'Active Mods', value: '12,400+', icon: Layers },
            { label: 'Daily Users', value: '45K+', icon: TrendingUp },
            { label: 'CC Creators', value: '800+', icon: Gamepad2 },
            { label: 'Total Likes', value: '2.5M', icon: Heart },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass p-6 rounded-3xl hover:bg-white/10 transition-colors cursor-default group"
            >
              <stat.icon className="w-6 h-6 text-brand-pink mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-3xl font-display font-black mb-1">{stat.value}</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{stat.label}</p>
            </motion.div>
          ))}
        </section>

        {/* What's New Section */}
        <section>
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tighter mb-4">WHAT'S NEW</h2>
              <p className="text-slate-400">The latest updates from the modding community.</p>
            </div>
            <button className="hidden md:flex items-center gap-2 text-sm font-bold text-brand-pink hover:text-brand-pink/80 transition-colors">
              VIEW ALL POSTS <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {POSTS.map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[16/10] rounded-[2.5rem] overflow-hidden mb-8 border border-white/5 shadow-xl group-hover:shadow-brand-pink/10 transition-all duration-500">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src = `https://picsum.photos/seed/${post.id}/800/500`;
                    }}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-6 left-6">
                    <span className="px-4 py-1.5 rounded-full glass text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-2xl">
                      {post.category}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center scale-0 group-hover:scale-100 transition-transform duration-500">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
                  <span>{post.date}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-pink/40" />
                  <span>{post.author}</span>
                </div>
                <h3 className="text-2xl font-display font-black leading-tight group-hover:text-brand-pink transition-colors line-clamp-2 mb-4">
                  {post.title}
                </h3>
                <div className="flex items-center gap-2 text-brand-pink font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                  Read Article <ArrowRight className="w-4 h-4" />
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-32 pb-16">
        <div className="max-w-[1800px] mx-auto px-8">
          <div className="grid md:grid-cols-4 gap-16 mb-32">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-pink to-brand-purple flex items-center justify-center">
                  <Sparkles className="text-white w-5 h-5" />
                </div>
                <span className="font-display text-xl font-black tracking-tighter">
                  MUSTHAVE<span className="text-brand-pink">MODS</span>
                </span>
              </div>
              <p className="text-slate-400 max-w-sm mb-8 leading-relaxed">
                The world's premier destination for Sims 4 content. We curate the best mods so you can focus on playing.
              </p>
              <div className="flex gap-4">
                {['Twitter', 'Discord', 'Instagram', 'Patreon'].map(social => (
                  <button key={social} className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors text-xs font-bold">
                    {social[0]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-slate-500">Quick Links</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-slate-500">Newsletter</h4>
              <p className="text-sm text-slate-400 mb-4">Get the best mods in your inbox weekly.</p>
              <div className="flex gap-2">
                <input type="email" placeholder="Email" className="glass bg-transparent border-none rounded-xl px-4 py-2 text-sm flex-1 focus:ring-2 ring-brand-pink/50" />
                <button className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold">Join</button>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-12 border-t border-white/5">
            <p className="text-xs text-slate-500">© 2026 MustHaveMods. All rights reserved. Not affiliated with Electronic Arts.</p>
            <button className="text-[10px] font-bold text-slate-500 hover:text-brand-pink transition-colors uppercase tracking-widest border border-white/10 px-4 py-2 rounded-full">
              Do Not Sell or Share My Personal Information
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
