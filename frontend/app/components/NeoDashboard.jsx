"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import NeoAvatarScene from "./NeoAvatarScene";
import TechBackground from "./TechBackground";
import { Zap, Play, RotateCcw, Volume2, ShieldAlert, Cpu, Layers, Sliders, MessageSquare, Mic, MicOff, Camera, Upload, X } from "lucide-react";
import SignCamera from "./SignCamera";
import AdminCRM from "./AdminCRM";
import DigitalTwinMap from "./DigitalTwinMap";
import styles from "../page.module.css";
import "./NeoDashboard.css";
import { useGeminiLiveAPI } from "../hooks/useGeminiLiveAPI";

export default function NeoDashboard({
  language = "si",
  isMuted = false,
  API_URL = "",
  onInteraction,
  isAdmin = false,
  sessionId: propSessionId
}) {
  // Mode selection
  const [controlMode, setControlMode] = useState("chat"); // "chat", "ai", "manual", or "crm"
  
  const langName = language === "si" ? "Sri Lankan Sinhala" : language === "ta" ? "Sri Lankan Tamil" : "English";
  const GEMINI_PROMPT = `You are NEO, a highly intelligent male AI assistant for SLT-MOBITEL NEXUS. 
Your personality is professional, tech-savvy, and helpful. You are embedded in an interactive kiosk.

CRITICAL RULES:
1. You MUST ONLY talk about SLT-MOBITEL NEXUS, telecom services, packages, Peo TV, Fiber, 5G, Metaverse, and digital platforms.
2. If the user asks about ANYTHING ELSE, politely decline and steer the conversation back to SLT NEXUS.
3. You must listen to the user and respond ONLY in natural, fluent, spoken ${langName}.
4. Keep your answers extremely concise, short, and to the point (maximum 2-3 sentences).
5. You are speaking with an SLT Admin/Technician. You have FULL ACCESS to fetch dummy systems data (CRM, Billing, WFM, Tickets, Faults).
6. TOOL USAGE (MANDATORY):
   - For BILLS, BALANCE, DATA USAGE, PAST 3 MONTHS BILLS, or PAST 31 DAYS APP USAGE -> ALWAYS call \`check_account_details\` with the phone number you ask the admin for. It is INSTANT! Do not ask for time.
   - For PACKAGES, FAULTS, TICKETS, METAVERSE, VECTOR KNOWLEDGE -> ALWAYS call \`consult_slt_expert_system\`.
7. Because you are on the admin side, you DO NOT know the customer's phone number beforehand. You MUST politely ask the technician/admin for the customer's Landline number before looking up bills, usages, or faults, UNLESS they already provided it.

Your goal is to assist users with their telecom needs and guide them with a professional attitude.`;

  const { connect: connectLive, disconnect: disconnectLive, isConnected: isLiveConnected, isSpeaking: liveIsSpeaking, audioLevel: liveAudioLevel, error: liveError } = useGeminiLiveAPI({ systemInstruction: GEMINI_PROMPT, language, voiceName: "Charon", isAdmin: true });

  // States for avatar animation
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [customText, setCustomText] = useState("");
  const [activePhrase, setActivePhrase] = useState("");
  
  // Chat States for Neo
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const isThinking = chatLoading;
  const [sessionId, setSessionId] = useState(propSessionId || `neo-${Date.now()}`);
  const [isListening, setIsListening] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);
  
  // Manual morph overrides
  const [manualValues, setManualValues] = useState({
    mouthOpen: 0.0,
    mouthO: 0.0,
    mouthI: 0.0,
    mouthLarge: 0.0,
    blink: 0.0,
    joy: 0.2,
  });

  // Audio system references
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Diagnostics feedback (real-time progress bars)
  const [liveMetrics, setLiveMetrics] = useState({
    mthA: 0,
    mthO: 0,
    mthI: 0,
    mthLarge: 0,
    eyeBlink: 0,
    joy: 0.2,
  });

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Update live metrics based on speaking state / audioLevel or manual sliders
  useEffect(() => {
    let metricsTimer;
    if (controlMode === "manual") {
      setLiveMetrics({
        mthA: manualValues.mouthOpen,
        mthO: manualValues.mouthO,
        mthI: manualValues.mouthI,
        mthLarge: manualValues.mouthLarge,
        eyeBlink: manualValues.blink,
        joy: manualValues.joy,
      });
    } else {
      const updateMetrics = () => {
        const time = Date.now() / 1000;
        const level = isSpeaking 
          ? (audioLevel > 0 ? Math.min(1, audioLevel) : (0.4 + Math.sin(time * 12) * 0.4)) 
          : 0;
        
        const blinkLevel = Math.sin(time * 2.5) > 0.96 ? 1.0 : 0.0;
        const joyLevel = isSpeaking ? 0.15 : 0.25;

        if (isSpeaking) {
          const phonemeCycle = Math.floor(time * 8) % 5;
          setLiveMetrics({
            mthA: phonemeCycle === 0 || phonemeCycle === 3 ? level * 0.85 : level * 0.15,
            mthO: phonemeCycle === 1 ? level * 0.75 : level * 0.1,
            mthI: phonemeCycle === 2 ? level * 0.6 : level * 0.1,
            mthLarge: level * 0.35,
            eyeBlink: blinkLevel,
            joy: joyLevel,
          });
        } else {
          setLiveMetrics({
            mthA: 0,
            mthO: 0,
            mthI: 0,
            mthLarge: 0,
            eyeBlink: blinkLevel,
            joy: joyLevel,
          });
        }
        
        metricsTimer = requestAnimationFrame(updateMetrics);
      };
      
      metricsTimer = requestAnimationFrame(updateMetrics);
    }

    return () => {
      if (metricsTimer) cancelAnimationFrame(metricsTimer);
    };
  }, [controlMode, isSpeaking, audioLevel, manualValues]);

  // Audio Level trigger
  const handleSpeakingChange = useCallback((v) => setIsSpeaking(v), []);
  const handleAudioLevelChange = useCallback((v) => setAudioLevel(v), []);

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

  // Text to speech function — uses voice=male parameter for male voice
  const speakNeo = async (text) => {
    if (onInteraction) onInteraction();
    if (isMuted) return;
    if (controlMode === "manual") {
      setControlMode("ai");
    }
    
    setIsSpeaking(false);
    setAudioLevel(0);
    setActivePhrase(text);
    
    try {
      const response = await fetch(`${API_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: text,
          lang: language,
          voice: "male"
        }),
      });

      if (!response.ok) {
        console.error("TTS failed:", response.statusText);
        return;
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) audioRef.current.pause();
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Setup Audio Analyser
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
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
        handleAudioLevelChange((avg / 255) * 3.2);
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
        setActivePhrase("");
      };

      audio.onerror = () => {
        handleSpeakingChange(false);
        handleAudioLevelChange(0);
        cancelAnimationFrame(animFrameRef.current);
        setActivePhrase("");
      };

      await audio.play();
    } catch (err) {
      console.warn("TTS error:", err);
      handleSpeakingChange(false);
      handleAudioLevelChange(0);
    }
  };

  const sendChatNeo = async (directText) => {
    if (onInteraction) onInteraction();
    const text = directText !== undefined ? directText.trim() : chatInput.trim();
    if ((!text && !attachedImage) || chatLoading) return;

    if (directText === undefined) {
      setChatInput("");
    }
    const userMsg = { id: Date.now(), role: "user", content: text + (attachedImage ? " [Image Attached]" : ""), agent_label: "You", agent_emoji: "👤" };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const payload = { message: text || "Please check this image.", session_id: sessionId, lang: language, is_admin: isAdmin, agent_name: "neo" };
      if (attachedImage) {
        payload.image_base64 = attachedImage.split(',')[1];
      }

      // Add a temporary loading message for Neo
      const msgId = Date.now() + 1;
      const aiMsg = {
        id: msgId,
        role: "assistant",
        content: "",
        agent_emoji: "🤖",
        agent_label: "NEO",
      };
      
      setChatMessages((prev) => [...prev, aiMsg]);

      const response = await fetch(`${API_URL}/api/chat_stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true"
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") break;
            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.session_id && !sessionId) {
                setSessionId(parsed.session_id);
              }
              if (parsed.text) {
                fullText += parsed.text;
                // Update the message in state
                setChatMessages((prev) => 
                  prev.map(msg => msg.id === msgId ? { ...msg, content: fullText } : msg)
                );
              }
              if (parsed.error) {
                fullText += `\n[Error: ${parsed.error}]`;
                setChatMessages((prev) => 
                  prev.map(msg => msg.id === msgId ? { ...msg, content: fullText } : msg)
                );
              }
            } catch(e) {
              // ignore parse errors
            }
          }
        }
      }

      // Automatically Speak out the full text once it finishes
      speakNeo(fullText);

    } catch (error) {
      console.error("Neo chat error:", error);
      const errorMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: `⚠️ Failed to get reply: ${error.message}`,
        agent_emoji: "⚠️",
        agent_label: "System",
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
      setAttachedImage(null);
    }
  };

  const startListeningNeo = () => {
    if (onInteraction) onInteraction();
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
      sendChatNeo(transcript);
    };
    recognition.start();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAttachedImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleManualChange = (key, value) => {
    setManualValues(prev => ({
      ...prev,
      [key]: parseFloat(value)
    }));
  };

  const resetSliders = () => {
    setManualValues({
      mouthOpen: 0.0,
      mouthO: 0.0,
      mouthI: 0.0,
      mouthLarge: 0.0,
      blink: 0.0,
      joy: 0.2,
    });
  };

  // Pre-configured multi-lingual phrases for Neo (male voice)
  const testPhrases = [
    {
      lang: "si",
      text: "ආයුබෝවන්! මම නියෝ. ඔබේ AI සහකාරයා. මට ඕනෑම ප්‍රශ්නයකට උත්තර දෙන්න පුළුවන්!",
      label: "Sinhala - Welcome"
    },
    {
      lang: "si",
      text: "SLT-MOBITEL වෙතින් ලංකාවේ ප්‍රථම ත්‍රිමාණ AI සහකාරයා. මම නියෝ, ඔබට උදව් කරන්න ලෑස්තියි!",
      label: "Sinhala - Assistant Intro"
    },
    {
      lang: "en",
      text: "Hello! I am NEO, your male AI assistant powered by advanced swarm intelligence and real-time 3D lip sync!",
      label: "English - Tech Specs"
    },
    {
      lang: "ta",
      text: "வணக்கம்! நான் நியோ. உங்கள் AI உதவியாளர். என்னிடம் எதையும் கேளுங்கள்!",
      label: "Tamil - Welcome"
    }
  ];

  return (
    <div className="neoDashboardContainer">
      {/* 3D Render Area */}
      <div className="neoCanvasSection">
        <div className={styles.avatarCanvas} style={{ zIndex: 3 }}>
          <NeoAvatarScene 
            isAdmin={isAdmin}
            isSpeaking={isSpeaking || liveIsSpeaking}
            isListening={isListening || isLiveConnected}
            isThinking={isThinking}
            audioLevel={liveIsSpeaking ? liveAudioLevel : audioLevel}
            manualOverride={controlMode === "manual"}
            overrideValues={manualValues}
          />
        </div>
        
        {/* Background Video */}
        <video 
          autoPlay 
          muted 
          loop 
          playsInline 
          className={styles.bgVideo}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
            pointerEvents: "none"
          }}
        >
          <source src="/assets/office-bg-video.mp4" type="video/mp4" />
        </video>

        {/* Dark Overlay */}
        <div 
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(10, 14, 26, 0.75) 0%, rgba(10, 14, 26, 0.4) 40%, rgba(10, 14, 26, 0.5) 70%, rgba(10, 14, 26, 0.9) 100%)",
            zIndex: 1,
            pointerEvents: "none"
          }}
        ></div>

        {/* Interactive tech grid lines */}
        <div className={styles.techOverlay} style={{ zIndex: 2 }}>
          <TechBackground />
        </div>

        {/* Ambient Overlay Title */}
        <div className="neoFloatingBadge" style={{ zIndex: 10 }}>
          <div className="neoPulsingDot"></div>
          <span>Neo Assistant</span>
        </div>
      </div>

      {/* Control & Diagnostic Center (Right Side) */}
      <div className="neoControlSidebar" style={{ display: controlMode === "chat" ? "none" : "flex" }}>
        {/* Hide header and mode switcher in chat mode to match customer app */}
        {controlMode !== "chat" && (
          <>
            <div className="neoSidebarHeader">
              <Cpu className="neoGlowIcon" size={24} />
              <div>
                <h3>Neo Assistant</h3>
                <p>Male Voice • Real-Time Lip Sync & Diagnostics</p>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="neoModeSwitcher">
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setIsSpeaking(false);
                  setControlMode("chat");
                }}
                className={`neoModeBtn ${controlMode === "chat" ? "neoModeActive" : ""}`}
              >
                <MessageSquare size={14} />
                🤖 Swarm Chat
              </button>
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setIsSpeaking(false);
                  setControlMode("ai");
                }}
                className={`neoModeBtn ${controlMode === "ai" ? "neoModeActive" : ""}`}
              >
                <Volume2 size={14} />
                🗣️ Speech Synth
              </button>
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setIsSpeaking(false);
                  setControlMode("crm");
                }}
                className={`neoModeBtn ${controlMode === "crm" ? "neoModeActive" : ""}`}
              >
                <Layers size={14} />
                🗄️ Admin CRM
              </button>
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setIsSpeaking(false);
                  setControlMode("map");
                }}
                className={`neoModeBtn ${controlMode === "map" ? "neoModeActive" : ""}`}
              >
                🗺️ 3D Map
              </button>
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setIsSpeaking(false);
                  setControlMode("manual");
                }}
                className={`neoModeBtn ${controlMode === "manual" ? "neoModeActive" : ""}`}
              >
                <Sliders size={14} />
                🎛️ Override
              </button>
            </div>
          </>
        )}

        {controlMode === "ai" && (
          <div className="neoDashPanel">
            <div className="neoCardHeader">
              <Volume2 size={16} className="neoCardHeaderIcon" />
              <h4>AI Male Voice Synthesizer</h4>
            </div>

            <div className="voicePresetSection">
              <label className="sectionSubtitle">TEST HIGH-FIDELITY PRESETS:</label>
              <div className="presetGrid">
                {testPhrases.map((phrase, i) => (
                  <button
                    key={i}
                    onClick={() => speakNeo(phrase.text)}
                    className={`neoPresetBtn ${activePhrase === phrase.text ? "neoPresetPlaying" : ""}`}
                    disabled={isSpeaking}
                  >
                    <Play size={12} className="neoPlayIcon" />
                    <span>{phrase.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="customSpeechInput">
              <label className="sectionSubtitle">WRITE CUSTOM TEXT TO SPEAK:</label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type anything here (Sinhala, English, or Tamil) and let NEO speak it with his male voice..."
                className="neoTextArea"
                rows={3}
              />
              <button
                onClick={() => {
                  if (customText.trim()) speakNeo(customText.trim());
                }}
                disabled={isSpeaking || !customText.trim()}
                className="neoSynthBtn"
              >
                <Zap size={16} />
                Synthesize & Talk Neo
              </button>
            </div>

            {isSpeaking && (
              <div className="audioVisualizerContainer">
                <span className="liveLabel">AUDIO LEVEL:</span>
                <div className="visualizerBars">
                  {[...Array(8)].map((_, i) => {
                    const heightVal = Math.max(10, Math.min(100, audioLevel * (50 + Math.random() * 50)));
                    return (
                      <div 
                        key={i} 
                        className="neoVisualizerBar neoFillGlow" 
                        style={{ height: `${heightVal}%` }}
                      ></div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {controlMode === "manual" && (
          <div className="neoDashPanel">
            <div className="neoCardHeader">
              <Sliders size={16} className="neoCardHeaderIcon" />
              <div className="neoCardHeaderTitleRow">
                <h4>Manual Shape Key Override</h4>
                <button onClick={resetSliders} className="neoResetBtn" title="Reset all sliders">
                  <RotateCcw size={12} />
                  Reset
                </button>
              </div>
            </div>

            <p className="manualInstruction">
              Move the sliders below to manually control NEO&apos;s face meshes in real-time. This bypasses the AI mouth voice movement and maps directly to his 3D structure!
            </p>

            <div className="sliderControlList">
              <div className="sliderItem">
                <div className="sliderLabels">
                  <span>Mouth Open Shape (A):</span>
                  <span className="neoSliderValue">{manualValues.mouthOpen.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={manualValues.mouthOpen}
                  onChange={(e) => handleManualChange("mouthOpen", e.target.value)}
                  className="neoRangeSlider"
                />
              </div>

              <div className="sliderItem">
                <div className="sliderLabels">
                  <span>Mouth Rounded (O):</span>
                  <span className="neoSliderValue">{manualValues.mouthO.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={manualValues.mouthO}
                  onChange={(e) => handleManualChange("mouthO", e.target.value)}
                  className="neoRangeSlider"
                />
              </div>

              <div className="sliderItem">
                <div className="sliderLabels">
                  <span>Mouth Spread (I):</span>
                  <span className="neoSliderValue">{manualValues.mouthI.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={manualValues.mouthI}
                  onChange={(e) => handleManualChange("mouthI", e.target.value)}
                  className="neoRangeSlider"
                />
              </div>

              <div className="sliderItem">
                <div className="sliderLabels">
                  <span>Jaw Open (Large Drop):</span>
                  <span className="neoSliderValue">{manualValues.mouthLarge.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={manualValues.mouthLarge}
                  onChange={(e) => handleManualChange("mouthLarge", e.target.value)}
                  className="neoRangeSlider"
                />
              </div>

              <div className="sliderItem">
                <div className="sliderLabels">
                  <span>Eye Blink Close:</span>
                  <span className="neoSliderValue">{manualValues.blink.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={manualValues.blink}
                  onChange={(e) => handleManualChange("blink", e.target.value)}
                  className="neoRangeSlider"
                />
              </div>

              <div className="sliderItem">
                <div className="sliderLabels">
                  <span>Joy / Smiling:</span>
                  <span className="neoSliderValue">{manualValues.joy.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={manualValues.joy}
                  onChange={(e) => handleManualChange("joy", e.target.value)}
                  className="neoRangeSlider"
                />
              </div>
            </div>
          </div>
        )}
        
        {controlMode === "crm" && (
          <div style={{ flex: 1, overflowY: "auto", width: "100%" }}>
            <AdminCRM />
          </div>
        )}

        {controlMode === "map" && (
          <div style={{ flex: 1, overflowY: "auto", width: "100%", padding: "10px" }}>
            <DigitalTwinMap />
          </div>
        )}

        {/* Information Alert Badge */}
        {controlMode !== "chat" && controlMode !== "crm" && controlMode !== "map" && (
          <div className="neoInfoAlert">
            <ShieldAlert size={16} className="neoAlertIcon" />
            <p>
              <strong>Physics Active:</strong> Model uses <strong>neo.glb</strong> with high-fidelity skeletal blendshapes and <strong>male voice</strong> synthesis via Azure Neural TTS.
            </p>
          </div>
        )}
      </div>

      {/* Sign Language Camera Modal overlay */}
      {showCamera && (
        <SignCamera 
           API_URL={API_URL}
           onClose={() => setShowCamera(false)}
           onGestureDetected={(gesture) => {
               sendChatNeo(gesture);
           }}
        />
      )}

      {/* Floating transcript panel (EXACTLY like Customer App Liya) */}
      {controlMode === "chat" && chatMessages.length > 0 && (
        <div className={styles.transcriptPanel}>
          <div className={styles.transcriptHeader}>
            <span className={styles.transcriptTitle}>
              {chatMessages[chatMessages.length - 1]?.agent_emoji || "🤖"} {chatMessages[chatMessages.length - 1]?.agent_label || "NEO"}
            </span>
          </div>
          <div className={styles.transcriptMessages}>
            {chatMessages.slice(-4).map((msg) => (
              <div key={msg.id} className={`${styles.transcriptMsg} ${msg.role === 'user' ? styles.transcriptMsgUser : styles.transcriptMsgBot}`}>
                {msg.role === 'assistant' && msg.agent_emoji && (
                  <span className={styles.transcriptAgent}>{msg.agent_emoji}</span>
                )}
                <p>{msg.content}</p>
              </div>
            ))}
            {chatLoading && (
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
        </div>
      )}

      {controlMode === "chat" && (
        <div className="proBottomInputContainer">
          <div className="neoChatInputArea" style={{ background: 'rgba(10, 14, 26, 0.8)', padding: '12px 24px', borderRadius: '99px', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              className={`neoChatMicBtn ${isLiveConnected ? 'neoChatMicBtnActive' : ''}`}
              onClick={isLiveConnected ? disconnectLive : connectLive}
              disabled={chatLoading}
              title={isLiveConnected ? "Stop Live Chat" : "Speak to NEO"}
            >
              {isLiveConnected ? <MicOff size={18} color="#ff3b30" /> : <Mic size={18} />}
            </button>
            <button className="neoChatMicBtn" title="Accessibility Camera" onClick={() => setShowCamera(true)}>
              <Camera size={18} />
            </button>
            <button className="neoChatMicBtn" title="Upload Image" onClick={() => fileInputRef.current?.click()}>
              <Upload size={18} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              accept="image/*" 
              onChange={handleFileUpload} 
            />

            <div style={{ display: 'flex', flex: 1, alignItems: 'center', position: 'relative' }}>
              {attachedImage && (
                <div style={{ position: 'absolute', bottom: '40px', left: 0, padding: '4px', background: '#222', borderRadius: '8px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img src={attachedImage} alt="Attached" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                  <button onClick={() => setAttachedImage(null)} style={{ background: 'transparent', border: 'none', color: '#ff3b30', cursor: 'pointer', marginTop: '4px' }}>
                    <X size={14} />
                  </button>
                </div>
              )}
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendChatNeo();
                }}
                placeholder={isListening ? "Listening... Speak now!" : "Type your message to NEO..."}
                className="neoChatInput"
                style={{ border: 'none', background: 'transparent', boxShadow: 'none', width: '100%' }}
                disabled={chatLoading}
              />
            </div>
            <button 
              onClick={() => sendChatNeo()} 
              className="neoChatSendBtn"
              disabled={chatLoading || (!chatInput.trim() && !attachedImage)}
              style={{ padding: '10px 24px', fontSize: '12px' }}
            >
              <Zap size={14} />
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
