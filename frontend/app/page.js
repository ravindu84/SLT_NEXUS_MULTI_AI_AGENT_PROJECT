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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
          body: JSON.stringify({ text: text.slice(0, 500) }),
        });
        if (!response.ok) return;
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
          handleAudioLevelChange(avg / 255);
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        audio.onplay = () => { handleSpeakingChange(true); updateLevel(); };
        audio.onended = () => {
          handleSpeakingChange(false);
          handleAudioLevelChange(0);
          cancelAnimationFrame(animFrameRef.current);
          audioContext.close();
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => { handleSpeakingChange(false); handleAudioLevelChange(0); };
        await audio.play();
      } catch (err) {
        console.warn("TTS error:", err);
        handleSpeakingChange(false);
      }
    },
    [isMuted, handleSpeakingChange, handleAudioLevelChange]
  );

  // Send message
  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;
    setInput("");
    const userMsg = { id: Date.now(), role: "user", content: messageText, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setIsThinking(true);
    setShowTranscript(true);
    setTimeout(scrollToBottom, 50);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, session_id: sessionId }),
      });
      if (!response.ok) throw new Error("API request failed");
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
      const errorMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: "⚠️ Could not connect to the server. Make sure the backend is running.",
        agent_emoji: "⚠️",
        agent_label: "System",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      setTimeout(scrollToBottom, 100);
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
          <div className={styles.logoBox}>
            <Zap className={styles.logoIcon} size={18} />
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
          <div className={styles.navBadge}>
            <span className={styles.liveDot}></span>
            <span>AI Powered</span>
          </div>
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

              {/* 3D Avatar */}
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
                  <span className={`${styles.agentChip} ${styles.agentChipMain}`} style={{ "--chip-color": "#2684ff" }}>🧠 LIYA</span>
                  <span className={styles.agentChip} style={{ "--chip-color": "#ffab00" }}>⚡ Spark</span>
                  <span className={styles.agentChip} style={{ "--chip-color": "#00c853" }}>💓 Pulse</span>
                  <span className={styles.agentChip} style={{ "--chip-color": "#00bcd4" }}>👁️ Insight</span>
                  <span className={styles.agentChip} style={{ "--chip-color": "#ff3d57" }}>🛡️ Guardian</span>
                  <span className={styles.agentChip} style={{ "--chip-color": "#9c27b0" }}>🔗 Vault</span>
                  <span className={styles.agentChip} style={{ "--chip-color": "#ff6d00" }}>📍 Dispatcher</span>
                  <span className={styles.agentChip} style={{ "--chip-color": "#4caf50" }}>🔍 Analyzer</span>
                  <span className={styles.agentChip} style={{ "--chip-color": "#03a9f4" }}>🔌 Provisioner</span>
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
      </div>
    </div>
  );
}
