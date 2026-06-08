import React from 'react';
import { motion } from 'framer-motion';
import { Users, BarChart, Package, ShieldCheck, Scale, Sparkles, ChevronDown } from 'lucide-react';

export default function FutureInnovations() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const features = [
    {
      id: 1,
      title: "AI Onboarding & Recruitment",
      department: "Human Resources (HR)",
      description: "Liya acts as an interactive HR Manager, training new recruits on company policies and conducting automated, video-based first-round interviews with sentiment analysis.",
      icon: <Users className="w-8 h-8 text-cyan-400" />,
      color: "from-cyan-500/20 to-blue-500/5"
    },
    {
      id: 2,
      title: "Smart Debt Negotiation",
      department: "Finance & Billing",
      description: "Moving beyond robotic reminders, Liya analyzes past payment patterns to negotiate custom payment extensions with customers, improving recovery rates through empathy.",
      icon: <BarChart className="w-8 h-8 text-emerald-400" />,
      color: "from-emerald-500/20 to-teal-500/5"
    },
    {
      id: 3,
      title: "Predictive Procurement",
      department: "Inventory & Procurement",
      description: "Liya analyzes weather patterns (e.g., high faults during rain) and historical usage to predict inventory needs for routers and cables, automatically generating orders before stock runs out.",
      icon: <Package className="w-8 h-8 text-purple-400" />,
      color: "from-purple-500/20 to-pink-500/5"
    },
    {
      id: 4,
      title: "Smart Visitor Management",
      department: "Physical Security",
      description: "Deployed on interactive kiosks, Liya welcomes visitors using facial recognition, registers their purpose, notifies the host, and provides indoor navigation.",
      icon: <ShieldCheck className="w-8 h-8 text-amber-400" />,
      color: "from-amber-500/20 to-orange-500/5"
    },
    {
      id: 5,
      title: "Blockchain-Powered Legal Management",
      department: "Legal & Compliance",
      description: "Integrating the LegalEdge framework, Liya handles corporate contracts and compliance. By combining AI analysis with Blockchain technology, it ensures immutable records, smart contract execution, and automated legal dispute resolution.",
      icon: <Scale className="w-8 h-8 text-rose-400" />,
      color: "from-rose-500/20 to-red-500/5"
    }
  ];

  return (
    <div className="min-h-full bg-[#0a0e17] text-slate-200 overflow-y-auto font-sans relative selection:bg-cyan-500/30">
      
      {/* Background Cyberpunk Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-900/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[150px]" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-purple-900/10 blur-[100px]" />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTM5IDM5VjFoLTM4djM4aDM4eiIgZmlsbD0icmdiYSg1NiwgMTg5LCAyNDgsIDAuMDMpIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-50" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 pb-32">
        
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-24 mt-10"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-6 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
            animate={{ boxShadow: ['0 0 20px rgba(34,211,238,0.2)', '0 0 40px rgba(34,211,238,0.4)', '0 0 20px rgba(34,211,238,0.2)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4" /> Liya Next-Gen Expansion
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white via-cyan-100 to-cyan-500 drop-shadow-lg">
            Beyond Customer Service:
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">The Future of Enterprise AI</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Liya is not just a customer assistant. She is engineered to scale across all departments, integrating advanced neural networks, predictive analytics, and Blockchain technology to orchestrate the entire enterprise.
          </p>
          
          <motion.div 
            className="mt-16 flex justify-center text-cyan-500/50"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-8 h-8" />
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <motion.div 
              key={feature.id}
              variants={itemVariants}
              className={`group relative bg-[#131825] border border-slate-800 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] hover:-translate-y-2 overflow-hidden ${index === 4 ? 'md:col-span-2 lg:col-span-1' : ''}`}
            >
              {/* Subtle gradient background specific to the card */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-xl bg-[#1c2333] border border-slate-700/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  {feature.icon}
                </div>
                
                <div className="text-xs font-bold tracking-wider uppercase text-slate-500 mb-2">
                  {feature.department}
                </div>
                
                <h3 className="text-2xl font-bold text-slate-100 mb-4 group-hover:text-cyan-300 transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer CTA */}
        <motion.div 
          className="mt-32 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-16" />
          <h2 className="text-3xl md:text-4xl font-bold text-slate-300 tracking-wide">
            Designed to <span className="text-cyan-400">Evolve.</span> Built for <span className="text-blue-500">Innovation.</span>
          </h2>
          <div className="mt-8 inline-block px-8 py-3 rounded-full border border-slate-800 text-slate-500 text-sm tracking-widest uppercase">
            Powered by SLT Nexus Multi-Agent Architecture
          </div>
        </motion.div>

      </div>
    </div>
  );
}
