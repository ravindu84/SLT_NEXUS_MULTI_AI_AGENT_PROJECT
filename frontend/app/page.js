"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./page.module.css";
import { useLanguage } from "./context/LanguageContext";
import { useTheme } from "./context/ThemeContext";
import { Zap, Mic, MicOff, Send, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";

// Dynamically load 3D components with SSR disabled
const AvatarScene = dynamic(() => import("./components/AvatarScene"), {
  ssr: false,
});

const VRTeleshop = dynamic(() => import("./components/nexus/VRTeleshop"), {
  ssr: false,
});

const TechBackground = dynamic(() => import("./components/TechBackground"), {
  ssr: false,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  const [view, setView] = useState("avatar");
  const [hasMounted, setHasMounted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Chat state (inline)
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const handleSpeakingChange = useCallback((v) => setIsSpeaking(v), []);
  const handleThinkingChange = useCallback((v) => setIsThinking(v), []);
  const handleAudioLevelChange = useCallback((v) => setAudioLevel(v), []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ElevenLabs TTS
  const speak = useCallback(
    async (text) => {
      if (isMuted) return;
      try {
        const response = await fetch(`${API_URL}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            text: text.length > 500 
              ? text.slice(0, text.lastIndexOf(' ', 500) || 500) 
              : text,
            lang: language 
          }),
        });
        if (!response.ok) return;
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) audioRef.current.pause();
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        // Reuse AudioContext if it exists
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const audioContext = audioContextRef.current;
        
        // We need to create a new source every time because a MediaElementSource
        // can only be connected to one AudioContext once.
        const source = audioContext.createMediaElementSource(audio);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        analyserRef.current = analyser;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          // Even higher sensitivity
          handleAudioLevelChange((avg / 255) * 8);
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        audio.onplay = () => { 
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }
          handleSpeakingChange(true); 
          updateLevel(); 
        };
        audio.onended = () => {
          handleSpeakingChange(false);
          handleAudioLevelChange(0);
          cancelAnimationFrame(animFrameRef.current);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => { handleSpeakingChange(false); handleAudioLevelChange(0); };
        await audio.play();
      } catch (err) {
        console.warn("TTS error:", err);
        handleSpeakingChange(false);
      }
    },
    [isMuted, handleSpeakingChange, handleAudioLevelChange, language]
  );

  // Send message
    const sendMessage = async (text, retryCount = 0) => {
      const messageText = text || input.trim();
      if (!messageText || isLoading) return;
      
      if (retryCount === 0) {
        setInput("");
        const userMsg = { id: Date.now(), role: "user", content: messageText, timestamp: new Date() };
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        setIsThinking(true);
        setShowTranscript(true);
        setTimeout(scrollToBottom, 50);
      }
  
      try {
        const response = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: messageText, session_id: sessionId, lang: language }),
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        const data = await response.json();
        setSessionId(data.session_id);
        const aiMsg = {
          id: Date.now() + 1,
          role: "assistant",
          content: data.response,
          agent_used: data.agent_used,
          agent_emoji: data.agent_emoji,
          agent_label: data.agent_label,
          intent: data.intent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        speak(data.response);
      } catch (error) {
        console.error(`Attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount < 2) {
          console.log("Retrying...");
          setTimeout(() => sendMessage(messageText, retryCount + 1), 1000);
          return;
        }
  
        const errorMsg = {
          id: Date.now() + 1,
          role: "assistant",
          content: `⚠️ Connection Error: ${error.message}. I tried 3 times but couldn't reach the server. Please check your internet or restart the backend.`,
          agent_emoji: "⚠️",
          agent_label: "System",
          timestamp: new Date(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        if (retryCount === 0 || retryCount >= 2) {
          setIsLoading(false);
          setIsThinking(false);
          setTimeout(scrollToBottom, 100);
        }
      }
    };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const newChat = () => {
    setMessages([]);
    setSessionId(null);
    setShowTranscript(false);
    if (audioRef.current) audioRef.current.pause();
    handleSpeakingChange(false);
    handleAudioLevelChange(0);
  };

  // Voice input
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
      sendMessage(transcript);
    };
    recognition.start();
  };

  // Voice input via event (for compatibility)
  useEffect(() => {
    const handleVoiceInput = (e) => sendMessage(e.detail);
    window.addEventListener("voice-input", handleVoiceInput);
    return () => window.removeEventListener("voice-input", handleVoiceInput);
  }, []);

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");

  return (
    <div className={`${styles.app} ${theme === 'dark' ? styles.dark : styles.light}`}>
      {/* Premium Header */}
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <img 
            src="/assets/logo.png" 
            alt="SLT NEXUS" 
            className={styles.mainLogo}
          />
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
          <div className={styles.langSwitcher}>
            {['en', 'si', 'ta'].map((ln) => (
              <button
                key={ln}
                onClick={() => setLanguage(ln)}
                className={`${styles.langBtn} ${language === ln ? styles.langBtnActive : ""}`}
              >
                {ln === 'en' ? 'EN' : ln === 'si' ? 'සිං' : 'த'}
              </button>
            ))}
          </div>
          <div className={styles.navBadge}>
            <span className={styles.liveDot}></span>
            <span>AI Powered</span>
          </div>
        </div>
      </nav>

      <div className={styles.mainContent}>
        {/* Avatar Section - Always Mounted for stability */}
        <div 
          className={styles.avatarSection}
          style={{ 
            opacity: view === "avatar" ? 1 : 0,
            pointerEvents: view === "avatar" ? "auto" : "none",
            position: "absolute",
            width: "100%",
            height: "100%",
            transition: "opacity 0.5s ease-in-out",
            zIndex: view === "avatar" ? 2 : 1
          }}
        >
          {/* 3D Avatar Canvas */}
          <div className={styles.avatarCanvas}>
            {hasMounted && (
              <AvatarScene
                isSpeaking={isSpeaking}
                isListening={isListening}
                isThinking={isThinking}
                audioLevel={audioLevel}
              />
            )}
          </div>

          {/* Background Video */}
          <video 
            autoPlay 
            muted 
            loop 
            playsInline 
            className={styles.bgVideo}
          >
            <source src="/assets/office-bg-video.mp4" type="video/mp4" />
          </video>

          {/* Digital Nexus Overlay */}
          {hasMounted && (
            <div className={styles.techOverlay}>
              <TechBackground />
            </div>
          )}

          {/* Avatar Name */}
          <div className={styles.avatarName}>
            <h1 className={styles.liyaTitle}>
              L<span className={styles.liyaAccent}>I</span>YA
            </h1>
            <p className={styles.liyaSubtitle}>Multi-Agent AI Avatar • SLT-MOBITEL</p>
          </div>

          {/* Status indicator */}
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

          {/* Floating transcript panel */}
          {showTranscript && messages.length > 0 && (
            <motion.div 
              className={styles.transcriptPanel}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={styles.transcriptHeader}>
                <span className={styles.transcriptTitle}>
                  {lastAssistantMsg?.agent_emoji} {lastAssistantMsg?.agent_label || "LIYA"}
                </span>
                <button className={styles.transcriptToggle} onClick={() => setShowTranscript(false)}>
                  <ChevronDown size={14} />
                </button>
              </div>
              <div className={styles.transcriptMessages}>
                {messages.slice(-4).map((msg) => (
                  <div key={msg.id} className={`${styles.transcriptMsg} ${msg.role === 'user' ? styles.transcriptMsgUser : styles.transcriptMsgBot}`}>
                    {msg.role === 'assistant' && msg.agent_emoji && (
                      <span className={styles.transcriptAgent}>{msg.agent_emoji}</span>
                    )}
                    <p>{msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content}</p>
                  </div>
                ))}
                {isLoading && (
                  <div className={`${styles.transcriptMsg} ${styles.transcriptMsgBot}`}>
                    <div className={styles.typingIndicator}>
                      <div className={styles.typingDot}></div>
                      <div className={styles.typingDot}></div>
                      <div className={styles.typingDot}></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </motion.div>
          )}

          {/* Bottom control bar */}
          <div className={styles.bottomBar}>
            {/* Agent chips row */}
            <div className={styles.agentChips}>
              <span className={`${styles.agentChip} ${(!lastAssistantMsg || lastAssistantMsg.agent_used === 'liya_agent') ? styles.agentChipActive : ''}`} style={{ "--chip-color": "#2684ff" }}>🧠 LIYA</span>
              <span className={`${styles.agentChip} ${(lastAssistantMsg?.agent_used === 'signa_agent') ? styles.agentChipActive : ''}`} style={{ "--chip-color": "#e91e63" }}>🤟 Signa</span>
              <span className={`${styles.agentChip} ${(lastAssistantMsg?.agent_used === 'oracle_agent') ? styles.agentChipActive : ''}`} style={{ "--chip-color": "#9c27b0" }}>🔮 Oracle</span>
              <span className={`${styles.agentChip} ${(lastAssistantMsg?.agent_used === 'pathfinder_agent') ? styles.agentChipActive : ''}`} style={{ "--chip-color": "#ff6d00" }}>📍 Pathfinder</span>
              <span className={`${styles.agentChip} ${(lastAssistantMsg?.agent_used === 'pulse_agent') ? styles.agentChipActive : ''}`} style={{ "--chip-color": "#00c853" }}>💓 Pulse</span>
              <span className={`${styles.agentChip} ${(lastAssistantMsg?.agent_used === 'insight_agent') ? styles.agentChipActive : ''}`} style={{ "--chip-color": "#00bcd4" }}>👁️ Insight</span>
              <span className={`${styles.agentChip} ${(lastAssistantMsg?.agent_used === 'spark_agent') ? styles.agentChipActive : ''}`} style={{ "--chip-color": "#ffab00" }}>⚡ Spark</span>
              <span className={`${styles.agentChip} ${(lastAssistantMsg?.agent_used === 'guardian_agent') ? styles.agentChipActive : ''}`} style={{ "--chip-color": "#ff3d57" }}>🛡️ Guardian</span>
              <span className={`${styles.agentChip} ${(lastAssistantMsg?.agent_used === 'vault_agent') ? styles.agentChipActive : ''}`} style={{ "--chip-color": "#607d8b" }}>🔗 Vault</span>
              <span className={`${styles.agentChip} ${(lastAssistantMsg?.agent_used === 'provisioner_agent') ? styles.agentChipActive : ''}`} style={{ "--chip-color": "#03a9f4" }}>🔌 Provisioner</span>
              <span className={`${styles.agentChip} ${(lastAssistantMsg?.agent_used === 'analyzer_agent') ? styles.agentChipActive : ''}`} style={{ "--chip-color": "#4caf50" }}>🔍 Analyzer</span>
              <span className={`${styles.agentChip} ${(lastAssistantMsg?.agent_used === 'messenger_agent') ? styles.agentChipActive : ''}`} style={{ "--chip-color": "#ff5722" }}>✉️ Messenger</span>
            </div>

            {/* Input bar */}
            <div className={styles.inputBar}>
              <button 
                className={`${styles.voiceBtn} ${isListening ? styles.voiceBtnActive : ""}`}
                onClick={startListening}
                disabled={isListening}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  className={styles.textInput}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type or speak to LIYA..."
                  disabled={isLoading}
                />
                <button
                  className={styles.sendBtn}
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                >
                  <Send size={16} />
                </button>
              </div>

              {messages.length > 0 && (
                <button className={styles.resetBtn} onClick={newChat} title="New Chat">
                  <RotateCcw size={16} />
                </button>
              )}

              {messages.length > 0 && !showTranscript && (
                <button className={styles.transcriptOpenBtn} onClick={() => setShowTranscript(true)} title="Show transcript">
                  <ChevronUp size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* VR Section - Always Mounted for stability */}
        <div 
          className={styles.vrSection}
          style={{ 
            opacity: view === "vr" ? 1 : 0,
            pointerEvents: view === "vr" ? "auto" : "none",
            position: "absolute",
            width: "100%",
            height: "100%",
            transition: "opacity 0.5s ease-in-out",
            zIndex: view === "vr" ? 2 : 1,
            backgroundColor: "#0a0e1a"
          }}
        >
          <VRTeleshop 
            onProductSelect={(label) => console.log('Selected:', label)} 
            onBack={() => setView('avatar')}
          />
        </div>
      </div>
    </div>
  );
}