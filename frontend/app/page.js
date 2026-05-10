"use client";

import { useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./page.module.css";
import ChatPanel from "./components/ChatPanel";
import TechBackground from "./components/TechBackground";
import { useLanguage } from "./context/LanguageContext";
import { useTheme } from "./context/ThemeContext";
import { Zap, Monitor, Layers, ShoppingCart, MessageSquare } from "lucide-react";

// Dynamically load 3D components with SSR disabled
const AvatarScene = dynamic(() => import("./components/AvatarScene"), {
  ssr: false,
});

const VRTeleshop = dynamic(() => import("./components/nexus/VRTeleshop"), {
  ssr: false,
});

export default function Home() {
  const [view, setView] = useState("avatar"); // "avatar" or "vr"
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(true);

  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const handleSpeakingChange = useCallback((v) => setIsSpeaking(v), []);
  const handleThinkingChange = useCallback((v) => setIsThinking(v), []);
  const handleAudioLevelChange = useCallback((v) => setAudioLevel(v), []);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === "si" ? "si-LK" : language === "ta" ? "ta-LK" : "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      window.dispatchEvent(new CustomEvent("voice-input", { detail: transcript }));
    };
    recognition.start();
  };

  return (
    <div className={`${styles.app} ${theme === 'dark' ? styles.dark : styles.light}`}>
      {/* Premium Header */}
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <div className={styles.logoBox}>
            <Zap className={styles.logoIcon} size={20} />
          </div>
          <span className={styles.logoText}>SLT NEXUS</span>
        </div>

        <div className={styles.navCenter}>
          <div className={styles.viewSwitcher}>
            <button 
              onClick={() => setView('avatar')}
              className={`${styles.viewBtn} ${view === 'avatar' ? styles.viewBtnActive : ""}`}
            >
              LIYA AI
            </button>
            <button 
              onClick={() => setView('vr')}
              className={`${styles.viewBtn} ${view === 'vr' ? styles.viewBtnActive : ""}`}
            >
              VR Shop
            </button>
          </div>
        </div>

        <div className={styles.navRight}>
          <div className={styles.langSelector}>
            {['en', 'si', 'ta'].map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`${styles.langBtn} ${language === lang ? styles.langBtnActive : ""}`}
              >
                {lang}
              </button>
            ))}
          </div>
          <button onClick={toggleTheme} className={styles.themeBtn}>
            {theme === 'dark' ? <Monitor size={18} /> : <Layers size={18} />}
          </button>
        </div>
      </nav>

      <div className={styles.mainContent}>
        <AnimatePresence mode="wait">
          {view === "avatar" ? (
            <motion.div 
              key="avatar"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className={styles.avatarSection}
            >
              <TechBackground />
              
              <div className={styles.avatarCanvas}>
                <AvatarScene
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  isThinking={isThinking}
                  audioLevel={audioLevel}
                />
              </div>

              <div className={styles.avatarStatus}>
                <div className={`${styles.statusIndicator} ${
                  isSpeaking ? styles.statusSpeaking : 
                  isListening ? styles.statusListening : 
                  isThinking ? styles.statusThinking : styles.statusIdle
                }`}>
                  <span className={styles.statusDotLarge}></span>
                  <span>
                    {isSpeaking ? "Speaking..." : isListening ? "Listening..." : isThinking ? "Thinking..." : "Ready"}
                  </span>
                </div>
              </div>

              <div className={styles.avatarName}>
                <h1 className={styles.liyaTitle}>
                  L<span className={styles.liyaAccent}>I</span>YA
                </h1>
                <p className={styles.liyaSubtitle}>Multi-Agent AI Avatar • SLT-MOBITEL</p>
              </div>

              <button
                className={`${styles.voiceBtn} ${isListening ? styles.voiceBtnActive : ""}`}
                onClick={startListening}
                disabled={isListening}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <div className={styles.agentChips}>
                <span className={styles.agentChip} style={{ "--chip-color": "#2684ff" }}>📦 Sales</span>
                <span className={styles.agentChip} style={{ "--chip-color": "#00c853" }}>🔧 Tech</span>
                <span className={styles.agentChip} style={{ "--chip-color": "#ff3d57" }}>🛡️ Scam</span>
                <span className={styles.agentChip} style={{ "--chip-color": "#ffab00" }}>👋 General</span>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="vr"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.vrSection}
            >
              <VRTeleshop onProductSelect={(label) => console.log('Selected:', label)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Panel - Persistent or Toggleable */}
        <div className={`${styles.chatWrapper} ${isChatOpen ? styles.chatOpen : styles.chatClosed}`}>
          <ChatPanel
            onSpeakingChange={handleSpeakingChange}
            onThinkingChange={handleThinkingChange}
            onAudioLevelChange={handleAudioLevelChange}
          />
        </div>
      </div>

      {/* Mobile Chat Toggle */}
      <button 
        className={styles.floatingChatBtn}
        onClick={() => setIsChatOpen(!isChatOpen)}
      >
        <MessageSquare size={24} />
      </button>
    </div>
  );
}
