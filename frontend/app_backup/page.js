'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';
import VRTeleshop from './components/nexus/VRTeleshop';
import { Box, Layers, Monitor, ShoppingCart, Shield, Zap, Globe, MessageSquare } from 'lucide-react';

export default function Home() {
  const [view, setView] = useState('vr'); // 'vr' or 'saas'
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <main className={`min-h-screen ${theme === 'dark' ? 'bg-[#0a0e1a] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-6 bg-transparent backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-slt-blue to-slt-green rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="text-white fill-white" size={24} />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase italic">SLT NEXUS</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
            <button 
              onClick={() => setView('vr')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'vr' ? 'bg-slt-blue text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              VR Shop
            </button>
            <button 
              onClick={() => setView('saas')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'saas' ? 'bg-slt-blue text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              SaaS View
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
            {['en', 'si', 'ta'].map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`text-xs font-bold uppercase ${language === lang ? 'text-slt-blue' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {lang}
              </button>
            ))}
          </div>

          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white"
          >
            {theme === 'dark' ? <Monitor size={20} /> : <Layers size={20} />}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {view === 'vr' ? (
          <motion.div 
            key="vr"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-screen"
          >
            <VRTeleshop onProductSelect={(label) => console.log('Selected:', label)} />
          </motion.div>
        ) : (
          <motion.div 
            key="saas"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="container mx-auto pt-32 px-6 pb-20"
          >
            {/* SaaS Landing Page Content */}
            <div className="max-w-4xl mx-auto text-center mb-20">
              <h2 className="text-6xl font-black mb-6 leading-tight">
                Empowering the <span className="text-gradient">Next Generation</span> of Connectivity
              </h2>
              <p className="text-xl text-slate-400 mb-10">
                SLT NEXUS is the world's first AI-driven B2B2C telecom ecosystem. Seamlessly bridge the gap between virtual experiences and physical fulfillment.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button className="px-8 py-4 bg-slt-blue text-white rounded-2xl font-bold shadow-2xl shadow-blue-500/20 hover:scale-105 transition-transform">
                  Explore Enterprise Plans
                </button>
                <button className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-colors">
                  Watch Demo
                </button>
              </div>
            </div>

            {/* Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: 'Free', price: 'Rs. 0', features: ['AI Support (Liya)', 'Basic Analytics', 'Mobile App Access'], icon: <Globe /> },
                { name: 'Pro', price: 'Rs. 4,999', features: ['Advanced Diagnostics', 'Priority Dispatch', 'Trilingual AI', 'Usage Forecasting'], icon: <Zap /> },
                { name: 'Enterprise', price: 'Custom', features: ['Dedicated Swarm', 'Blockchain Logs', 'Full WFM Integration', 'Custom VR Shop'], icon: <Shield /> },
              ].map((tier, i) => (
                <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-slt-blue/50 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-slt-blue/20 flex items-center justify-center text-slt-blue mb-6 group-hover:scale-110 transition-transform">
                    {tier.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                  <div className="text-4xl font-black mb-6">{tier.price}<span className="text-sm text-slate-500 font-normal">/mo</span></div>
                  <ul className="space-y-4 mb-8">
                    {tier.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-slt-green" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button className="w-full py-4 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-slt-blue hover:border-slt-blue transition-all">
                    Choose Plan
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Button */}
      <button className="fixed bottom-10 right-10 w-16 h-16 bg-gradient-to-br from-slt-blue to-slt-green rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 hover:scale-110 transition-transform group">
        <MessageSquare className="text-white group-hover:animate-pulse" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0a0e1a]" />
      </button>
    </main>
  );
}
