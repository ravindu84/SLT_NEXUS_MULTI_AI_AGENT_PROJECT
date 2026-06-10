"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { useAudio } from "../context/AudioContext";
import { Phone, Lock, Hash, ArrowRight, Zap, User, CreditCard, Mail, MapPin, ShieldCheck, QrCode, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function AuthPage(props) {
  const AppleIcon = () => (
    <svg viewBox="0 0 384 512" className="w-6 h-6 fill-current">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
    </svg>
  );

  const PlayIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
      <path d="M5 22h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2z" opacity="0"/>
      <path d="M7 4v16l13-8L7 4z"/>
    </svg>
  );

  const onAuthSuccess = props.onAuthSuccess;
  const router = useRouter();
  const { playMusic } = useAudio();
  const [tab, setTab] = useState("existing");
  const [step, setStep] = useState(1);
  const [isDesktop, setIsDesktop] = useState(true);
  
  // Existing Customer State
  const [phone, setPhone] = useState("");
  
  // New Customer State
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [nic, setNic] = useState("");
  const [email, setEmail] = useState("");
  const [gpsVerified, setGpsVerified] = useState(false);
  const [isHuman, setIsHuman] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Common State
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    playMusic();
    setIsDesktop(window.innerWidth > 768);
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [playMusic]);

  const handleExistingPhoneSubmit = async (e) => {
    e.preventDefault();
    if (phone.length < 9) {
      setError("Please enter a valid SLT phone number");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 600);
  };

  const handleExistingOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return setError("Enter a 6-digit OTP");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (onAuthSuccess) {
        onAuthSuccess(phone);
      } else {
        router.push('/admin');
      }
    }, 800);
  };

  const handleGpsFetch = () => {
    setGpsLoading(true);
    setTimeout(() => {
      setGpsVerified(true);
      setGpsLoading(false);
    }, 1500);
  };

  const handleNewCustomerSubmit = (e) => {
    e.preventDefault();
    if (!name || !nic || !mobile || mobile.length < 9) {
      setError("Please fill all details correctly.");
      return;
    }
    if (!gpsVerified) {
      setError("Please verify your location first.");
      return;
    }
    if (!isHuman) {
      setError("Please complete human verification.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleNewCustomerOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return setError("Enter a 6-digit OTP");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (onAuthSuccess) {
        onAuthSuccess(mobile);
      } else {
        router.push('/admin');
      }
    }, 800);
  };

  // Variants for animations
  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut", staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 bg-[#09090b] overflow-hidden font-sans">
      {/* Animated Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] mix-blend-screen animate-pulse pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-screen animate-pulse pointer-events-none" />

      <motion.div 
        className="relative z-10 w-full max-w-4xl flex gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left Sidebar - QR Codes (Modern App Download) */}
        {isDesktop && (
          <motion.div variants={itemVariants} className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col justify-center items-center text-white shadow-2xl relative overflow-hidden">
            {/* Glossy highlight */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="mb-8"
            >
              <img src="/assets/logo.png" alt="SLT NEXUS" className="h-[60px] w-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
            </motion.div>
            
            <h2 className="text-2xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Get the NEXUS App
            </h2>
            <p className="text-zinc-400 text-sm text-center mb-8 max-w-[200px]">
              Scan to download on your device for the ultimate experience.
            </p>
            
            <div className="flex flex-col gap-3 w-full max-w-[200px]">
              <motion.a 
                whileHover={{ scale: 1.05, y: -2 }} 
                whileTap={{ scale: 0.95 }}
                href="#" 
                className="flex items-center gap-3 bg-black/60 hover:bg-black border border-white/10 hover:border-white/30 rounded-xl px-4 py-2.5 transition-all shadow-lg"
              >
                <AppleIcon />
                <div className="flex flex-col items-start justify-center">
                  <span className="text-[10px] text-zinc-400 leading-none mb-0.5">Download on the</span>
                  <span className="text-sm font-semibold text-white leading-tight">App Store</span>
                </div>
              </motion.a>
              <motion.a 
                whileHover={{ scale: 1.05, y: -2 }} 
                whileTap={{ scale: 0.95 }}
                href="#" 
                className="flex items-center gap-3 bg-black/60 hover:bg-black border border-white/10 hover:border-white/30 rounded-xl px-4 py-2.5 transition-all shadow-lg"
              >
                <PlayIcon />
                <div className="flex flex-col items-start justify-center">
                  <span className="text-[10px] text-zinc-400 leading-none mb-0.5">GET IT ON</span>
                  <span className="text-sm font-semibold text-white leading-tight">Google Play</span>
                </div>
              </motion.a>
            </div>
          </motion.div>
        )}

        {/* Right Side - Auth Form */}
        <motion.div variants={itemVariants} className="flex-[1.5] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          
          {/* Tabs */}
          {step === 1 && (
            <motion.div variants={itemVariants} className="flex bg-black/40 p-1 rounded-xl mb-8 border border-white/5">
              <button 
                onClick={() => setTab("existing")} 
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${tab === "existing" ? "bg-white/10 text-white shadow-md border border-white/10" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
              >
                Existing User
              </button>
              <button 
                onClick={() => setTab("new")} 
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${tab === "new" ? "bg-white/10 text-white shadow-md border border-white/10" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
              >
                New Connection
              </button>
            </motion.div>
          )}

          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {step === 2 ? "Verify OTP" : tab === "existing" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-zinc-400 text-sm">
              {step === 2 ? "Enter the 6-digit code sent to your mobile" : tab === "existing" ? "Log in with your SLT Number" : "Join SLT-MOBITEL today"}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm mb-6 text-center shadow-[0_0_15px_rgba(239,68,68,0.15)]"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* EXISTING USER TAB */}
          {tab === "existing" && step === 1 && (
            <motion.form variants={itemVariants} onSubmit={handleExistingPhoneSubmit} className="flex flex-col gap-5">
              <div className="relative group">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="text" placeholder="SLT Number (e.g. 0112895800)" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={10} required
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500"
                />
              </div>
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit" disabled={loading} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl py-3.5 text-sm font-semibold flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all disabled:opacity-70"
              >
                {loading ? "Checking..." : "Continue"} <ArrowRight size={18} />
              </motion.button>
            </motion.form>
          )}

          {/* NEW CUSTOMER TAB */}
          {tab === "new" && step === 1 && (
            <motion.form variants={itemVariants} onSubmit={handleNewCustomerSubmit} className="flex flex-col gap-4">
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-400 transition-colors" />
                <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500" />
              </div>
              <div className="relative group">
                <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-400 transition-colors" />
                <input type="text" placeholder="NIC Number" value={nic} onChange={(e) => setNic(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500" />
              </div>
              <div className="relative group">
                <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-400 transition-colors" />
                <input type="text" placeholder="Mobile Number (07X...)" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))} maxLength={10} required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500" />
              </div>
              <div className="relative group mb-2">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-400 transition-colors" />
                <input type="email" placeholder="Email Address (Optional)" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500" />
              </div>

              {/* Location & Human Check */}
              <div className="flex flex-col sm:flex-row gap-3 mb-2">
                <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={handleGpsFetch} disabled={gpsVerified || gpsLoading} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-medium transition-all ${gpsVerified ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "bg-black/40 border-white/10 text-white hover:bg-white/5"}`}>
                  <MapPin size={16} /> {gpsLoading ? "Fetching..." : gpsVerified ? "Coverage Validated" : "Fetch Location"}
                </motion.button>
                <motion.div whileTap={{ scale: 0.97 }} onClick={() => setIsHuman(!isHuman)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${isHuman ? "bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "bg-black/40 border-white/10 text-white hover:bg-white/5"}`}>
                  <ShieldCheck size={16} /> {isHuman ? "Human Verified" : "I am Human"}
                </motion.div>
              </div>

              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl py-3.5 text-sm font-semibold flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
                Send Verification Code <ArrowRight size={18} />
              </motion.button>
              
              <div className="text-center mt-2">
                <span className="text-xs text-zinc-400 hover:text-white cursor-pointer transition-colors" onClick={() => setStep(2)}>
                  Already started? Verify Mobile
                </span>
              </div>
            </motion.form>
          )}

          {/* OTP STEP (Shared for both) */}
          {step === 2 && (
            <motion.form variants={itemVariants} onSubmit={tab === "existing" ? handleExistingOtpSubmit : handleNewCustomerOtpSubmit} className="flex flex-col gap-5">
              <div className="relative group">
                <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="text" placeholder="Enter 6-digit OTP" value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={6} required
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white text-lg tracking-[0.3em] font-medium outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500 placeholder:tracking-normal placeholder:font-normal placeholder:text-sm text-center"
                />
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl py-3.5 text-sm font-semibold flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all disabled:opacity-70">
                {loading ? "Verifying..." : "Enter NEXUS"} <ArrowRight size={18} />
              </motion.button>
              <div className="text-center mt-2">
                <span className="text-xs text-zinc-400 hover:text-white cursor-pointer transition-colors" onClick={() => setStep(1)}>
                  Back to Details
                </span>
              </div>
            </motion.form>
          )}

        </motion.div>
      </motion.div>
    </main>
  );
}
