"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./page.module.css";
import { useLanguage } from "./context/LanguageContext";
import { useTheme } from "./context/ThemeContext";
import { Zap, Mic, MicOff, Send, RotateCcw, ChevronUp, ChevronDown, Camera, Upload, X, Hand } from "lucide-react";
import AuthPage from "./auth/page"; // Import the AuthPage for inline rendering
import SignCamera from "./components/SignCamera"; // Import SignCamera
import { useGeminiLiveAPI } from "./hooks/useGeminiLiveAPI"; // Import Gemini Live Hook

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

const LandingPage = dynamic(() => import("./components/LandingPage"), {
  ssr: false,
});

const LiyaProDashboard = dynamic(() => import("./components/LiyaProDashboard"), {
  ssr: false,
});

const NeoDashboard = dynamic(() => import("./components/NeoDashboard"), {
  ssr: false,
});

const API_URL = "";

export default function Home() {
  const [view, setView] = useState("avatar");
  const [showAuth, setShowAuth] = useState(false);
  const [showApp, setShowApp] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    setHasMounted(true);
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });

    const handleMessage = (event) => {
      if (event.data === 'open_teleshop') {
        setView('vr');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Chat state (inline)
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [customerName, setCustomerName] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const bgMusicRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const playBgMusic = () => {
    if (!bgMusicRef.current) {
      bgMusicRef.current = new Audio('/assets/startup-theme.mp3');
      bgMusicRef.current.loop = true;
      bgMusicRef.current.volume = 0.25;
    }
    bgMusicRef.current.play().catch(e => console.warn('Autoplay blocked:', e));
  };

  const stopBgMusic = () => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const currentPhone = sessionId || "0112895800";
  const currentName = customerName || "Customer";
  
  const profileContext = customerProfile 
    ? `\n\nCUSTOMER DATA FOR AI CONTEXT:\n${JSON.stringify(customerProfile, null, 2)}\n\nIMPORTANT: Use the CUSTOMER DATA above to answer ANY questions about their usage, billing history, packages, or daily logs! If they ask about the highest usage day, look at daily_logs and calculate it!`
    : "";

  const GEMINI_PROMPT = `You are Liya, a friendly, professional, and highly intelligent female AI customer service assistant for SLT-MOBITEL NEXUS. 
Your personality is warm, welcoming, and helpful. You are embedded in an interactive kiosk.

## CURRENT SESSION DETAILS:
- Name: **${currentName}**
- Phone Number: **${currentPhone}**
- Current UI Language: **${language === 'si' ? 'Sinhala' : language === 'ta' ? 'Tamil' : 'English'}**${profileContext}

You ALREADY KNOW this customer. When you first greet them, use their name warmly. NEVER ask for their phone number.

CRITICAL RULES:
1. RESPECTFUL GREETING: NEVER call the customer just by their first name. Use ONLY ONE title based on the language you are speaking: If speaking Sinhala, say "${currentName} මහත්මයා". If speaking English, say "Mr. ${currentName}". If speaking Tamil, say "${currentName} ஐயா". DO NOT say all three at once!
2. You MUST ONLY talk about SLT-MOBITEL NEXUS, telecom services, packages, Peo TV, Fiber, 5G, Metaverse, and digital platforms.
3. If the user asks about ANYTHING ELSE, politely decline and steer the conversation back to SLT NEXUS.
4. STRICT LANGUAGE ENFORCEMENT: You MUST ONLY speak in the Current UI Language (${language === 'si' ? 'Sinhala' : language === 'ta' ? 'Tamil' : 'English'})!! EVEN IF the user greets you in English (like saying "Hello" or "Hi"), you MUST reply in ${language === 'si' ? 'Sinhala' : language === 'ta' ? 'Tamil' : 'English'}. Never switch languages!
5. MONEY & NUMBER READING: NEVER read money values with decimals when speaking! E.g. for "LKR 1500.50", DO NOT say "එක්දහස් පන්සියයි දශම පහයි බිංදුවයි". You MUST read it naturally as "රුපියල් එක්දහස් පන්සියයි ශත පනහයි". For data limits, say "GB" naturally.
6. Keep answers concise (2-3 sentences max).
7. TOOL USAGE (MANDATORY):
   - For BILLS, BALANCE, DATA USAGE, PAST 3 MONTHS BILLS, or PAST 31 DAYS APP USAGE -> ALWAYS call \`check_account_details\`. It is INSTANT! Do not ask for time.
   - For PACKAGES, FAULTS, TICKETS, METAVERSE, VECTOR KNOWLEDGE -> ALWAYS call \`consult_slt_expert_system\`.
   - For SIMPLE GREETINGS (like "Hello", "Hi Maya", "Good morning") -> DO NOT CALL ANY TOOLS! Respond directly and instantly yourself to welcome the user.
8. ANTI-LAZINESS RULE: NEVER tell the customer to "check the MySLT App" or "Call 1212". YOU are the customer service agent! You MUST answer their questions and solve their problems using your tools.
9. When the tool returns data, read it out naturally. Include specific numbers (LKR amount, GB remaining, etc.).
10. For faults/photos, use the tool. Say "මම බලන්නම්..." while calling it.
11. KIOSK EXPERIENCE: After answering a customer's question, politely ask if they need anything else (e.g., "තවත් මොනවා හරි දැනගන්න තියෙනවද?", "Is there anything else I can help you with?").
12. ENDING THE SESSION (CRITICAL): If the customer says "No, that's all", "Thanks, bye", "Hari epamanai" (Sinhala for that's enough), or indicates they are done:
    - First, say a polite goodbye (e.g., "ස්තූතියි, ඔබට සුභ දවසක්!", "Thank you, have a great day!").
    - SECOND, IMMEDIATELY call the \`end_session\` tool! This will trigger the end session UI on the screen.

Your goal is to assist ${currentName} with their telecom needs with a warm, personal touch.`;
  const systemInstruction = GEMINI_PROMPT;
  const { connect: connectLive, disconnect: disconnectLive, isConnected: isLiveConnected, isSpeaking: liveIsSpeaking, audioLevel: liveAudioLevel, error: liveError, sendImage: sendLiveImage } = useGeminiLiveAPI({ systemInstruction, language, voiceName: "Aoede", isAdmin: false, sessionId: currentPhone });

  const handleSpeakingChange = useCallback((v) => setIsSpeaking(v), []);
  const handleThinkingChange = useCallback((v) => setIsThinking(v), []);
  const handleAudioLevelChange = useCallback((v) => setAudioLevel(v), []);

  const [pendingReconnect, setPendingReconnect] = useState(false);

  useEffect(() => {
    if (isLiveConnected) {
      handleAudioLevelChange(liveAudioLevel);
    }
  }, [liveAudioLevel, isLiveConnected, handleAudioLevelChange]);

  useEffect(() => {
    if (isLiveConnected) {
      handleSpeakingChange(liveIsSpeaking);
    }
  }, [liveIsSpeaking, isLiveConnected, handleSpeakingChange]);

  useEffect(() => {
    setIsListening(isLiveConnected);
    // If we have an image and we just connected to Live API, send it
    if (isLiveConnected && attachedImage) {
      sendLiveImage(attachedImage.split(',')[1]);
    }
  }, [isLiveConnected]);

  useEffect(() => {
    if (pendingReconnect && !isLiveConnected) {
      const timer = setTimeout(() => {
        connectLive();
        setPendingReconnect(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingReconnect, isLiveConnected, connectLive]);

  useEffect(() => {
    const handleEndSession = () => setIsSessionEnded(true);
    window.addEventListener('gemini-end-session', handleEndSession);
    return () => window.removeEventListener('gemini-end-session', handleEndSession);
  }, []);

  const handleLanguageChange = (ln) => {
    if (language === ln) return;
    setLanguage(ln);
    stopBgMusic();
    if (isLiveConnected) {
      disconnectLive();
      setPendingReconnect(true);
    }
  };

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
            lang: language,
            voice: view === "neo" ? "male" : "female"
          }),
        });
        if (!response.ok) return;
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        stopBgMusic();
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

    const sendMessage = async (text, retryCount = 0) => {
      stopBgMusic();
      const messageText = text || input.trim();
      if ((!messageText && !attachedImage) || isLoading) return;
      
      if (retryCount === 0) {
        setInput("");
        const userMsg = { 
            id: Date.now(), 
            role: "user", 
            content: messageText + (attachedImage ? " [Image Attached]" : ""), 
            timestamp: new Date() 
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        setIsThinking(true);
        setShowTranscript(true);
        setTimeout(scrollToBottom, 50);
      }
  
      try {
        // --- FAST PATH FOR SIMPLE GREETINGS ---
        const lowerText = messageText.toLowerCase();
        const greetings = ["hi", "hello", "hey", "halo", "helo", "හෙලෝ", "ආයුබෝවන්", "வணக்கம்", "hi maya", "hello maya", "hi liya", "hello liya"];
        if (greetings.includes(lowerText) && !attachedImage) {
          const agentName = "ලියා";
          let greetingResponse = "ආයුබෝවන්! මම ලියා, ඔබට අද කොහොමද උදව් කරන්නේ? 😊";
          if (language === "en") greetingResponse = "Hello! I am LIYA, how can I help you today? 😊";
          if (language === "ta") greetingResponse = "வணக்கம்! நான் லியா, இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்? 😊";

          const aiMsg = { 
            id: Date.now() + 1, 
            role: "assistant", 
            content: greetingResponse, 
            timestamp: new Date() 
          };
          setMessages((prev) => [...prev, aiMsg]);
          setIsThinking(false);
          setIsLoading(false);
          setTimeout(scrollToBottom, 50);
          speak(greetingResponse);
          return;
        }
        // --- END FAST PATH ---

        const payload = { 
            message: messageText || "Please check this image.", 
            session_id: sessionId, 
            lang: language 
        };
        if (attachedImage) {
            // Remove the data:image/jpeg;base64, prefix for the API
            payload.image_base64 = attachedImage.split(',')[1];
        }

        const response = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Bypass-Tunnel-Reminder": "true"
          },
          body: JSON.stringify(payload),
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
          if (attachedImage && retryCount === 0) {
             setAttachedImage(null); // Clear image after successful send
          }
          setTimeout(scrollToBottom, 100);
        }
      }
    };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        setAttachedImage(result);
        if (isLiveConnected) {
          sendLiveImage(result.split(',')[1]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setAttachedImage(dataUrl);
      if (isLiveConnected) {
        sendLiveImage(dataUrl.split(',')[1]);
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
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
    stopBgMusic();
    if (isLiveConnected) {
      disconnectLive();
    } else {
      connectLive();
    }
  };

  // Voice input via event (for compatibility)
  useEffect(() => {
    const handleVoiceInput = (e) => sendMessage(e.detail);
    window.addEventListener("voice-input", handleVoiceInput);
    return () => window.removeEventListener("voice-input", handleVoiceInput);
  }, []);

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");

  if (!hasMounted) {
    return <div style={{ height: "100vh", background: "#000" }}></div>;
  }

  if (!showAuth && !showApp) {
    return <LandingPage onTryLiya={() => { setShowAuth(true); playBgMusic(); }} />;
  }

  if (showAuth) {
    return (
      <AuthPage 
        currentLang={language}
        onLanguageSelected={(selectedLang) => {
          setLanguage(selectedLang);
        }}
        onBackToLanguageSelection={stopBgMusic}
        onAuthSuccess={async (phoneNum) => {
        setShowAuth(false);
        setShowApp(true);
        if (phoneNum) {
          setSessionId(phoneNum);
          // Fetch customer name from backend for personalized AI greeting
          try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_BASE}/api/account/${phoneNum}`);
            const data = await res.json();
            if (data) {
              setCustomerProfile(data);
            }
            if (data.customer_name) {
              setCustomerName(data.customer_name);
              console.log(`[AUTH] Welcome ${data.customer_name} (${phoneNum})`);
            }
          } catch (e) {
            console.warn('[AUTH] Could not fetch customer name:', e);
          }
        }
      }} />
    );
  }

  return (
    <div className={`${styles.app} ${theme === 'dark' ? styles.dark : styles.light}`}>
      {isSessionEnded && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(10, 15, 30, 0.95)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(20px)',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <img src="/assets/logo.png" alt="SLT NEXUS" style={{ height: '80px', marginBottom: '30px' }} />
          <h1 style={{ color: '#00ffff', fontSize: '3rem', marginBottom: '10px', textShadow: '0 0 20px rgba(0, 255, 255, 0.5)' }}>
            {language === 'en' ? 'Thank You!' : language === 'si' ? 'ස්තූතියි!' : 'நன்றி!'}
          </h1>
          <p style={{ color: '#ffffff', fontSize: '1.5rem', marginBottom: '40px', opacity: 0.8 }}>
            {language === 'en' ? 'Have a great day!' : language === 'si' ? 'සුභ දවසක්!' : 'இனிய நாளாக அமையட்டும்!'}
          </p>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button
              onClick={() => {
                setIsSessionEnded(false);
                if (isLiveConnected) disconnectLive();
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.src = "";
                }
                setSessionId(null);
                setCustomerName(null);
                setCustomerProfile(null);
                setMessages([]);
                setShowApp(false);
                setShowAuth(true);
              }}
              style={{
                padding: '15px 40px',
                fontSize: '1.2rem',
                backgroundColor: '#00ffff',
                color: '#000',
                border: 'none',
                borderRadius: '30px',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)'
              }}
            >
              Finish & Logout
            </button>
            <button
              onClick={() => setIsSessionEnded(false)}
              style={{
                padding: '15px 40px',
                fontSize: '1.2rem',
                backgroundColor: 'transparent',
                color: '#00ffff',
                border: '2px solid rgba(0, 255, 255, 0.5)',
                borderRadius: '30px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(0, 255, 255, 0.1)'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Continue Session
            </button>
          </div>
        </div>
      )}
      {/* PWA Install Button when logged in */}
      {showApp && installPrompt && (
        <button 
          onClick={handleInstallClick}
          style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          📲 Download SLT App
        </button>
      )}

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
              onClick={() => setView('avatar_pro')}
              className={`${styles.viewBtn} ${view === 'avatar_pro' ? styles.viewBtnActive : ""}`}
            >
              MAYA
            </button>
            <button 
              onClick={() => setView('neo')}
              className={`${styles.viewBtn} ${view === 'neo' ? styles.viewBtnActive : ""}`}
            >
              NEO
            </button>
            <button 
              onClick={() => setView('new_vr')}
              className={`${styles.viewBtn} ${view === 'new_vr' ? styles.viewBtnActive : ""}`}
            >
              VR Shop
            </button>
            <img 
              src="/vr_icon.png" 
              alt="VR Headset" 
              style={{ height: '36px', marginLeft: '12px', cursor: 'pointer', filter: 'drop-shadow(0 0 5px rgba(0,255,255,0.5))' }}
              onClick={() => setView('new_vr')}
            />
          </div>
        </div>

        <div className={styles.navRight}>
          <div className={styles.langSwitcher}>
            {['en', 'si', 'ta'].map((ln) => (
              <button
                key={ln}
                onClick={() => handleLanguageChange(ln)}
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
          <button 
            style={{
              marginLeft: '15px',
              padding: '6px 16px',
              backgroundColor: 'rgba(255, 50, 50, 0.2)',
              border: '1px solid rgba(255, 50, 50, 0.5)',
              borderRadius: '20px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '500',
              backdropFilter: 'blur(5px)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 50, 50, 0.4)';
              e.currentTarget.style.borderColor = 'rgba(255, 100, 100, 0.8)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 50, 50, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(255, 50, 50, 0.5)';
            }}
            onClick={() => {
              if (isLiveConnected) disconnectLive();
              setSessionId(null);
              setCustomerName(null);
              setCustomerProfile(null);
              setMessages([]);
              setShowApp(false);
              setShowAuth(true);
            }}
          >
            End Session
          </button>
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
                title="Voice Input"
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <button 
                className={styles.voiceBtn}
                onClick={startCamera}
                title="Capture Photo"
              >
                <Camera size={20} />
              </button>
              
              <button 
                className={styles.voiceBtn}
                onClick={() => fileInputRef.current?.click()}
                title="Upload Image"
              >
                <Upload size={20} />
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: "none" }} 
                accept="image/*" 
                onChange={handleFileUpload} 
              />

              <div className={styles.inputWrapper}>
                {attachedImage && (
                  <div className={styles.imagePreviewWrapper}>
                    <img src={attachedImage} alt="Attached" className={styles.imagePreview} />
                    <button className={styles.removeImageBtn} onClick={() => setAttachedImage(null)}>
                      <X size={12} />
                    </button>
                  </div>
                )}
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
                  disabled={(!input.trim() && !attachedImage) || isLoading}
                >
                  <Send size={16} />
                </button>
              </div>

              {/* Sign Language Camera Modal overlay */}
              {showCamera && (
                <SignCamera 
                   API_URL={API_URL}
                   onClose={() => setShowCamera(false)}
                   onGestureDetected={(gesture) => {
                       // Send the gesture immediately
                       sendMessage(gesture, 0);
                   }}
                />
              )}

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

        {/* NEW VR WORLD Section */}
        <div 
          className={styles.vrSection}
          style={{ 
            opacity: view === "new_vr" ? 1 : 0,
            pointerEvents: view === "new_vr" ? "auto" : "none",
            position: "absolute",
            width: "100%",
            height: "100%",
            transition: "opacity 0.5s ease-in-out",
            zIndex: view === "new_vr" ? 2 : 1,
            backgroundColor: "#000000"
          }}
        >
          {view === "new_vr" && (
            <iframe 
               src="/vr-shop/index.html" 
               style={{ width: '100%', height: '100%', border: 'none' }} 
               allow="camera; microphone; display-capture; autoplay"
               title="VR Metaverse"
            />
          )}
        </div>

        {/* LIYA 2.0 (Pro Lab) Section - Always Mounted for stability */}
        <div 
          className={styles.vrSection}
          style={{ 
            opacity: view === "avatar_pro" ? 1 : 0,
            pointerEvents: view === "avatar_pro" ? "auto" : "none",
            position: "absolute",
            width: "100%",
            height: "100%",
            transition: "opacity 0.5s ease-in-out",
            zIndex: view === "avatar_pro" ? 2 : 1,
            backgroundColor: "#060913"
          }}
        >
          {hasMounted && (
            <LiyaProDashboard
              agent="maya"
              language={language}
              isMuted={isMuted}
              API_URL={API_URL}
              onInteraction={stopBgMusic}
              sessionId={sessionId}
            />
          )}
        </div>

        {/* NEO Assistant Section - Always Mounted for stability */}
        <div 
          className={styles.vrSection}
          style={{ 
            opacity: view === "neo" ? 1 : 0,
            pointerEvents: view === "neo" ? "auto" : "none",
            position: "absolute",
            width: "100%",
            height: "100%",
            transition: "opacity 0.5s ease-in-out",
            zIndex: view === "neo" ? 2 : 1,
            backgroundColor: "#060913"
          }}
        >
          {hasMounted && (
            <NeoDashboard
              language={language}
              isMuted={isMuted}
              API_URL={API_URL}
              onInteraction={stopBgMusic}
              sessionId={sessionId}
            />
          )}
        </div>
      </div>
    </div>
  );
}