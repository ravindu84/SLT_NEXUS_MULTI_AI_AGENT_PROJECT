"use client";

import { useState, useEffect, useRef } from "react";
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
  
  // Video Background Sync
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;
    
    const handlePlay = () => { audio.play().catch(e=>console.log(e)); };
    const handlePause = () => audio.pause();
    const handleSeek = () => { audio.currentTime = video.currentTime; };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeek);
    
    video.play().catch(e=>console.log(e));

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeek);
    }
  }, []);

  const [tab, setTab] = useState("existing");
  const [step, setStep] = useState(1);
  const [isDesktop, setIsDesktop] = useState(true);
  const [lang, setLang] = useState("en");

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
    setIsDesktop(window.innerWidth > 768);
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const t = {
    en: {
      existingUser: "Existing User",
      newConnection: "New Connection",
      welcomeBack: "Welcome Back",
      loginSub: "Log in with your SLT Number",
      sltNumber: "SLT Number (e.g. 0112895800)",
      continue: "Continue",
      enterOtp: "Enter Verification Code",
      verify: "Verify & Login",
      createAccount: "Create Account",
      joinToday: "Join SLT-MOBITEL today",
      fullName: "Full Name",
      nic: "NIC Number",
      mobile: "Mobile Number (07X...)",
      email: "Email Address (Optional)",
      fetchLocation: "Fetch Location",
      locationVerified: "Coverage Validated",
      iamHuman: "I am Human",
      humanVerified: "Human Verified",
      sendCode: "Send Verification Code",
      alreadyStarted: "Already started? Verify Mobile",
      getApp: "Get the NEXUS App",
      scanToDownload: "Scan to download on your device for the ultimate experience.",
      enter6Digit: "Enter a 6-digit OTP",
      validPhone: "Please enter a valid SLT phone number",
      fillDetails: "Please fill all details correctly.",
      verifyLocFirst: "Please verify your location first.",
      humanVerFirst: "Please complete human verification.",
      fetching: "Fetching...",
      verifying: "Verifying...",
      checking: "Checking...",
      enterNexus: "Enter NEXUS",
      backToDetails: "Back to Details",
      verifyOtpTitle: "Verify OTP",
      enter6DigitSent: "Enter the 6-digit code sent to your mobile"
    },
    si: {
      existingUser: "පාරිභෝගික",
      newConnection: "නව සබඳතා",
      welcomeBack: "ආයුබෝවන්",
      loginSub: "ඔබගේ SLT අංකය ඇතුලත් කරන්න",
      sltNumber: "SLT අංකය (උදා. 0112895800)",
      continue: "ඉදිරියට",
      enterOtp: "සත්‍යාපන කේතය ඇතුලත් කරන්න",
      verify: "සත්‍යාපනය කර පිවිසෙන්න",
      createAccount: "නව ගිණුමක් සාදන්න",
      joinToday: "අදම SLT-MOBITEL හා එක්වන්න",
      fullName: "සම්පූර්ණ නම",
      nic: "ජා.හැ. අංකය",
      mobile: "ජංගම දුරකථන අංකය (07X...)",
      email: "ඊමේල් ලිපිනය (විකල්ප)",
      fetchLocation: "ස්ථානය ලබාගන්න",
      locationVerified: "ස්ථානය තහවුරුයි",
      iamHuman: "මම මනුෂ්‍යයෙක්",
      humanVerified: "තහවුරුයි",
      sendCode: "සත්‍යාපන කේතය යවන්න",
      alreadyStarted: "දැනටමත් පටන් ගෙනද? දුරකථනය තහවුරු කරන්න",
      getApp: "NEXUS App එක ලබාගන්න",
      scanToDownload: "ඔබගේ දුරකථනයට App එක බාගත කරගන්න",
      enter6Digit: "ඉලක්කම් 6ක කේතය",
      validPhone: "නිවැරදි SLT අංකයක් ඇතුලත් කරන්න",
      fillDetails: "කරුණාකර සියලුම විස්තර නිවැරදිව පුරවන්න.",
      verifyLocFirst: "කරුණාකර ඔබගේ ස්ථානය තහවුරු කරන්න.",
      humanVerFirst: "කරුණාකර ඔබ මනුෂ්‍යයෙක් බව තහවුරු කරන්න.",
      fetching: "ලබාගනිමින්...",
      verifying: "සත්‍යාපනය කරමින්...",
      checking: "පරික්ෂා කරමින්...",
      enterNexus: "NEXUS වෙත පිවිසෙන්න",
      backToDetails: "පෙර පිටුවට",
      verifyOtpTitle: "කේතය තහවුරු කරන්න",
      enter6DigitSent: "ඔබගේ දුරකථනයට ආ කේතය ඇතුලත් කරන්න"
    },
    ta: {
      existingUser: "வாடிக்கையாளர்",
      newConnection: "புதிய இணைப்பு",
      welcomeBack: "வரவேற்கிறோம்",
      loginSub: "உங்கள் SLT எண்ணை உள்ளிடவும்",
      sltNumber: "SLT எண் (எ.கா. 0112895800)",
      continue: "தொடரவும்",
      enterOtp: "சரிபார்ப்பு குறியீட்டை உள்ளிடவும்",
      verify: "உள்நுழையவும்",
      createAccount: "கணக்கை உருவாக்கவும்",
      joinToday: "இன்றே இணையுங்கள்",
      fullName: "முழு பெயர்",
      nic: "அடையாள அட்டை எண்",
      mobile: "மொபைல் எண் (07X...)",
      email: "மின்னஞ்சல் முகவரி",
      fetchLocation: "இருப்பிடத்தை பெறுங்கள்",
      locationVerified: "இருப்பிடம் சரிபார்க்கப்பட்டது",
      iamHuman: "நான் மனிதன்",
      humanVerified: "சரிபார்க்கப்பட்டது",
      sendCode: "குறியீட்டை அனுப்பவும்",
      alreadyStarted: "தொடங்கியுள்ளதா? மொபைலை சரிபார்க்கவும்",
      getApp: "NEXUS ஆப்பை பெறுங்கள்",
      scanToDownload: "ஆப்பை பதிவிறக்கம் செய்யுங்கள்.",
      enter6Digit: "6 இலக்க குறியீட்டை உள்ளிடவும்",
      validPhone: "சரியான SLT எண்ணை உள்ளிடவும்",
      fillDetails: "அனைத்து விவரங்களையும் சரியாக நிரப்பவும்.",
      verifyLocFirst: "உங்கள் இருப்பிடத்தை சரிபார்க்கவும்.",
      humanVerFirst: "மனித சரிபார்ப்பை முடிக்கவும்.",
      fetching: "பெறப்படுகிறது...",
      verifying: "சரிபார்க்கப்படுகிறது...",
      checking: "சரிபார்க்கப்படுகிறது...",
      enterNexus: "NEXUS இல் நுழையவும்",
      backToDetails: "பின்செல்லவும்",
      verifyOtpTitle: "குறியீட்டை சரிபார்க்கவும்",
      enter6DigitSent: "குறியீட்டை உள்ளிடவும்"
    }
  };

  const curr = t[lang];

  const handleExistingPhoneSubmit = async (e) => {
    e.preventDefault();
    if (phone.length < 9) {
      setError(curr.validPhone);
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
    if (otp.length < 6) return setError(curr.enter6Digit);
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
      setError(curr.fillDetails);
      return;
    }
    if (!gpsVerified) {
      setError(curr.verifyLocFirst);
      return;
    }
    if (!isHuman) {
      setError(curr.humanVerFirst);
      return;
    }
    setError("");
    setStep(2);
  };

  const handleNewCustomerOtpSubmit = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return setError(curr.enter6Digit);
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
      
      {/* BACKGROUND VIDEO & AUDIO */}
      <video 
        ref={videoRef}
        src="/assets/kiosk_video.mp4" 
        autoPlay loop muted playsInline
        className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-70"
      />
      <audio ref={audioRef} src="/assets/kiosk_sound.mp3" loop />
      
      {/* Background overlay so the form stands out */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-0 pointer-events-none" />

      {/* LANGUAGE SELECTOR */}
      <div className="absolute top-6 right-6 z-50 flex gap-2 bg-black/40 p-1.5 rounded-full border border-white/10 backdrop-blur-md shadow-2xl">
        {["en", "si", "ta"].map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              lang === l 
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            {l === "en" ? "EN" : l === "si" ? "සිං" : "தமி"}
          </button>
        ))}
      </div>

      {/* Animated Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[150px] mix-blend-screen animate-pulse pointer-events-none z-0" />

      <motion.div 
        className="relative z-10 w-full max-w-4xl flex gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left Sidebar - QR Codes (Modern App Download) */}
        {isDesktop && (
          <motion.div variants={itemVariants} className="flex-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col justify-center items-center text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            
            <motion.div 
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="mb-8"
            >
              <img src="/assets/logo.png" alt="SLT NEXUS" className="h-[60px] w-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
            </motion.div>
            
            <h2 className="text-2xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              {curr.getApp}
            </h2>
            <p className="text-zinc-300 text-sm text-center mb-8 max-w-[200px]">
              {curr.scanToDownload}
            </p>
            
            <div className="flex flex-row items-center justify-center gap-5 w-full mt-2">
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                className="bg-white p-2.5 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center"
              >
                <QrCode size={80} className="text-black" />
              </motion.div>

              <div className="flex flex-col gap-3 w-full max-w-[160px]">
                <motion.a 
                  whileHover={{ scale: 1.05, x: 2 }} 
                  whileTap={{ scale: 0.95 }}
                  href="#" 
                  className="flex items-center gap-3 bg-black/60 hover:bg-black border border-white/10 hover:border-white/30 rounded-xl px-3 py-2 transition-all shadow-lg w-full"
                >
                  <AppleIcon />
                  <div className="flex flex-col items-start justify-center">
                    <span className="text-[9px] text-zinc-400 leading-none mb-0.5">Download on the</span>
                    <span className="text-xs font-semibold text-white leading-tight">App Store</span>
                  </div>
                </motion.a>
                <motion.a 
                  whileHover={{ scale: 1.05, x: 2 }} 
                  whileTap={{ scale: 0.95 }}
                  href="#" 
                  className="flex items-center gap-3 bg-black/60 hover:bg-black border border-white/10 hover:border-white/30 rounded-xl px-3 py-2 transition-all shadow-lg w-full"
                >
                  <PlayIcon />
                  <div className="flex flex-col items-start justify-center">
                    <span className="text-[9px] text-zinc-400 leading-none mb-0.5">GET IT ON</span>
                    <span className="text-xs font-semibold text-white leading-tight">Google Play</span>
                  </div>
                </motion.a>
              </div>
            </div>
          </motion.div>
        )}

        {/* Right Side - Auth Form */}
        <motion.div variants={itemVariants} className="flex-[1.5] bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          
          {/* Tabs */}
          {step === 1 && (
            <motion.div variants={itemVariants} className="flex bg-black/40 p-1 rounded-xl mb-8 border border-white/5">
              <button 
                onClick={() => setTab("existing")} 
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${tab === "existing" ? "bg-white/10 text-white shadow-md border border-white/10" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
              >
                {curr.existingUser}
              </button>
              <button 
                onClick={() => setTab("new")} 
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${tab === "new" ? "bg-white/10 text-white shadow-md border border-white/10" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
              >
                {curr.newConnection}
              </button>
            </motion.div>
          )}

          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {step === 2 ? curr.verifyOtpTitle : tab === "existing" ? curr.welcomeBack : curr.createAccount}
            </h1>
            <p className="text-zinc-300 text-sm">
              {step === 2 ? curr.enter6DigitSent : tab === "existing" ? curr.loginSub : curr.joinToday}
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
                  type="text" placeholder={curr.sltNumber} value={phone}
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
                {loading ? curr.checking : curr.continue} <ArrowRight size={18} />
              </motion.button>
            </motion.form>
          )}

          {/* NEW CUSTOMER TAB */}
          {tab === "new" && step === 1 && (
            <motion.form variants={itemVariants} onSubmit={handleNewCustomerSubmit} className="flex flex-col gap-4">
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-400 transition-colors" />
                <input type="text" placeholder={curr.fullName} value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500" />
              </div>
              <div className="relative group">
                <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-400 transition-colors" />
                <input type="text" placeholder={curr.nic} value={nic} onChange={(e) => setNic(e.target.value)} required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500" />
              </div>
              <div className="relative group">
                <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-400 transition-colors" />
                <input type="text" placeholder={curr.mobile} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ''))} maxLength={10} required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500" />
              </div>
              <div className="relative group mb-2">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-400 transition-colors" />
                <input type="email" placeholder={curr.email} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500" />
              </div>

              {/* Location & Human Check */}
              <div className="flex flex-col sm:flex-row gap-3 mb-2">
                <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={handleGpsFetch} disabled={gpsVerified || gpsLoading} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-medium transition-all ${gpsVerified ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "bg-black/40 border-white/10 text-white hover:bg-white/5"}`}>
                  <MapPin size={16} /> {gpsLoading ? curr.fetching : gpsVerified ? curr.locationVerified : curr.fetchLocation}
                </motion.button>
                <motion.div whileTap={{ scale: 0.97 }} onClick={() => setIsHuman(!isHuman)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${isHuman ? "bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]" : "bg-black/40 border-white/10 text-white hover:bg-white/5"}`}>
                  <ShieldCheck size={16} /> {isHuman ? curr.humanVerified : curr.iamHuman}
                </motion.div>
              </div>

              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl py-3.5 text-sm font-semibold flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all">
                {curr.sendCode} <ArrowRight size={18} />
              </motion.button>
              
              <div className="text-center mt-2">
                <span className="text-xs text-zinc-400 hover:text-white cursor-pointer transition-colors" onClick={() => setStep(2)}>
                  {curr.alreadyStarted}
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
                  type="text" placeholder={curr.enter6Digit} value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={6} required
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white text-lg tracking-[0.3em] font-medium outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-500 placeholder:tracking-normal placeholder:font-normal placeholder:text-sm text-center"
                />
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl py-3.5 text-sm font-semibold flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all disabled:opacity-70">
                {loading ? curr.verifying : curr.enterNexus} <ArrowRight size={18} />
              </motion.button>
              <div className="text-center mt-2">
                <span className="text-xs text-zinc-400 hover:text-white cursor-pointer transition-colors" onClick={() => setStep(1)}>
                  {curr.backToDetails}
                </span>
              </div>
            </motion.form>
          )}

        </motion.div>
      </motion.div>
    </main>
  );
}
