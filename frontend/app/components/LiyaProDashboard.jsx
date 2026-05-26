"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AvatarScenePro from "./AvatarScenePro";
import TechBackground from "./TechBackground";
import { Zap, Play, RotateCcw, Volume2, ShieldAlert, Cpu, Layers, Sliders, MessageSquare, Mic, MicOff, Camera, Upload, X } from "lucide-react";
import styles from "../page.module.css";
import "./LiyaProLab.css";

export default function LiyaProDashboard({
  agent = "liya", // "liya" or "maya"
  language = "en",
  isMuted = false,
  API_URL = "https://16.171.166.199.nip.io",
  onInteraction,
  isAdmin = false
}) {
  const isMaya = agent === "maya";
  const agentName = isMaya ? "MAYA" : "LIYA";
  const agentVersion = isMaya ? "2.0" : "3.0 (Head of AI)";
  const modelPath = isMaya ? "/assets/maya.glb" : "/assets/liya.glb";

  // Mode selection
  const [controlMode, setControlMode] = useState("chat"); // "chat", "ai" or "manual"
  
  // States for avatar animation
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [customText, setCustomText] = useState("");
  const [activePhrase, setActivePhrase] = useState("");
  
  // Chat States for Pro Lab
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const isThinking = chatLoading;
  const [sessionId, setSessionId] = useState(`pro-${Date.now()}`);
  const [isListening, setIsListening] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

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
      // AI / Automatic mode
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

  // Text to speech function
  const speakPro = async (text) => {
    if (onInteraction) onInteraction();
    if (isMuted) return;
    if (controlMode === "manual") {
      setControlMode("ai"); // automatically switch back to AI mode so they can see it sync!
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
          voice: "female"
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
        handleAudioLevelChange((avg / 255) * 3.2); // Sensitivity scaling
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

  const sendChatPro = async (directText) => {
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
      const payload = { message: text || "Please check this image.", session_id: sessionId, lang: language, is_admin: isAdmin };
      if (attachedImage) {
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
      
      if (data.session_id) setSessionId(data.session_id);
      
      const aiMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.response,
        agent_used: data.agent_used,
        agent_emoji: data.agent_emoji || "🧠",
        agent_label: data.agent_label || agentName,
      };

      setChatMessages((prev) => [...prev, aiMsg]);
      speakPro(data.response);
    } catch (error) {
      console.error("Pro chat error:", error);
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

  const startListeningPro = () => {
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
      sendChatPro(transcript);
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

  // Pre-configured multi-lingual phrases that show off mouth opening shapes (visemes) beautifully
  const testPhrases = [
    {
      lang: "si",
      text: "ආයුබෝවන්! මම ලියා 2.0. මගේ කට දැන් ඉතාම ලස්සනට ඇරෙනවා!",
      label: "Sinhala - Welcome"
    },
    {
      lang: "si",
      text: "SLT-MOBITEL වෙතින් ලංකාවේ ප්‍රථම ත්‍රිමාණ AI සහකාරිය. ඔයාට මගෙන් මොනවද වෙන්න ඕනේ?",
      label: "Sinhala - Assistant Intro"
    },
    {
      lang: "en",
      text: "Hello! I am MAYA version 2.0, now rendering with active, fully-articulated 3D phoneme mouth blendshapes!",
      label: "English - Tech Specs"
    },
    {
      lang: "ta",
      text: "வணக்கம்! நான் லியா 2.0. என்னால் இப்போது அழகாக பேச முடியும்!",
      label: "Tamil - Welcome"
    }
  ];

  return (
    <div className="proDashboardContainer">
      {/* 3D Render Area (Left/Full Background depending on layout) */}
      <div className="proCanvasSection">
        <div className={styles.avatarCanvas} style={{ zIndex: 3 }}>
          <AvatarScenePro
            key={modelPath}
            modelPath={modelPath}
            isAdmin={isAdmin}
            isSpeaking={isSpeaking}
            isListening={isListening}
            isThinking={isThinking}
            audioLevel={audioLevel}
            manualOverride={controlMode === "manual"}
            overrideValues={manualValues}
          />
        </div>
        
        {/* Background Video */}
        <video 
          ref={useRef()}
          autoPlay 
          muted 
          loop 
          playsInline 
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
            pointerEvents: "none",
            opacity: 1
          }}
        >
          <source src="/assets/office-bg-video.mp4" type="video/mp4" />
        </video>

        {/* High-end Sci-fi Ambient Gradient Overlay */}
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
        <div className="proFloatingBadge" style={{ zIndex: 10 }}>
          <div className="pulsingDot red"></div>
          <span>{agentName} Assistant</span>
        </div>
      </div>

      {/* Control & Diagnostic Center (Right Side) */}
      <div className="proControlSidebar" style={{ display: controlMode === "chat" ? "none" : "flex" }}>
        {/* Hide header and mode switcher in chat mode to match customer app */}
        {controlMode !== "chat" && (
          <>
            <div className="sidebarHeader">
              <Cpu className="sidebarIcon glowIcon" size={24} />
              <div>
                <h3>{agentName} Assistant</h3>
                <p>Advanced Real-Time Lip Sync & Diagnostics</p>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="controlModeSwitcher">
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setIsSpeaking(false);
                  setControlMode("chat");
                }}
                className={`modeSwitchBtn ${controlMode === "chat" ? "activeMode" : ""}`}
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
                className={`modeSwitchBtn ${controlMode === "ai" ? "activeMode" : ""}`}
              >
                <Volume2 size={14} />
                🗣️ Speech Synth
              </button>
              <button
                onClick={() => {
                  if (audioRef.current) audioRef.current.pause();
                  setIsSpeaking(false);
                  setControlMode("manual");
                }}
                className={`modeSwitchBtn ${controlMode === "manual" ? "activeMode" : ""}`}
              >
                <Sliders size={14} />
                🎛️ Override
              </button>
            </div>
          </>
        )}

        {/* Real-time Diagnostics (Viseme Metrics) - Hidden in Chat Mode to give space to the beautiful chat */}




        {controlMode === "ai" && (
          <div className="dashboardPanel">
            <div className="cardHeader">
              <Volume2 size={16} className="cardHeaderIcon" />
              <h4>AI Swarm Voice Synthesizer</h4>
            </div>

            <div className="voicePresetSection">
              <label className="sectionSubtitle">TEST HIGH-FIDELITY PRESETS:</label>
              <div className="presetGrid">
                {testPhrases.map((phrase, i) => (
                  <button
                    key={i}
                    onClick={() => speakPro(phrase.text)}
                    className={`presetPhraseBtn ${activePhrase === phrase.text ? "playingPreset" : ""}`}
                    disabled={isSpeaking}
                  >
                    <Play size={12} className="phrasePlayIcon" />
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
                placeholder={`Type anything here (Sinhala, English, or Tamil) and let ${agentName} speak it with full lip sync...`}
                className="proTextArea"
                rows={3}
              />
              <button
                onClick={() => {
                  if (customText.trim()) speakPro(customText.trim());
                }}
                disabled={isSpeaking || !customText.trim()}
                className="synthesizeBtn"
              >
                <Zap size={16} />
                Synthesize & Talk Pro
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
                        className="visualizerBar fillGlow" 
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
          <div className="dashboardPanel">
            <div className="cardHeader">
              <Sliders size={16} className="cardHeaderIcon" />
              <div className="cardHeaderTitleRow">
                <h4>Manual Shape Key Override</h4>
                <button onClick={resetSliders} className="miniResetBtn" title="Reset all sliders">
                  <RotateCcw size={12} />
                  Reset
                </button>
              </div>
            </div>

            <p className="manualInstruction">
              Move the sliders below to manually control {agentName}'s face meshes in real-time. This bypasses the AI mouth voice movement and maps directly to her 3D structure!
            </p>

            <div className="sliderControlList">
              <div className="sliderItem">
                <div className="sliderLabels">
                  <span>Mouth Open Shape (A):</span>
                  <span className="sliderValue">{manualValues.mouthOpen.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={manualValues.mouthOpen}
                  onChange={(e) => handleManualChange("mouthOpen", e.target.value)}
                  className="proRangeSlider"
                />
              </div>

              <div className="sliderItem">
                <div className="sliderLabels">
                  <span>Mouth Rounded (O):</span>
                  <span className="sliderValue">{manualValues.mouthO.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={manualValues.mouthO}
                  onChange={(e) => handleManualChange("mouthO", e.target.value)}
                  className="proRangeSlider"
                />
              </div>

              <div className="sliderItem">
                <div className="sliderLabels">
                  <span>Mouth Spread (I):</span>
                  <span className="sliderValue">{manualValues.mouthI.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={manualValues.mouthI}
                  onChange={(e) => handleManualChange("mouthI", e.target.value)}
                  className="proRangeSlider"
                />
              </div>

              <div className="sliderItem">
                <div className="sliderLabels">
                  <span>Jaw Open (Large Drop):</span>
                  <span className="sliderValue">{manualValues.mouthLarge.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={manualValues.mouthLarge}
                  onChange={(e) => handleManualChange("mouthLarge", e.target.value)}
                  className="proRangeSlider"
                />
              </div>

              <div className="sliderItem">
                <div className="sliderLabels">
                  <span>Eye Blink Close:</span>
                  <span className="sliderValue">{manualValues.blink.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={manualValues.blink}
                  onChange={(e) => handleManualChange("blink", e.target.value)}
                  className="proRangeSlider"
                />
              </div>

              <div className="sliderItem">
                <div className="sliderLabels">
                  <span>Joy / Smiling:</span>
                  <span className="sliderValue">{manualValues.joy.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={manualValues.joy}
                  onChange={(e) => handleManualChange("joy", e.target.value)}
                  className="proRangeSlider"
                />
              </div>
            </div>
          </div>
        )}

        {/* Information Alert Badge */}
        {controlMode !== "chat" && (
          <div className="proInfoAlert">
            <ShieldAlert size={16} className="alertIcon" />
            <p>
              <strong>Physics Active:</strong> Model uses <strong>{isMaya ? "maya.glb" : "liya.glb"}</strong> with 57 high-fidelity skeletal blendshapes, resolving mouth opening limitations.
            </p>
          </div>
        )}
      </div>

      {/* Floating transcript panel (EXACTLY like Customer App Liya) */}
      {controlMode === "chat" && chatMessages.length > 0 && (
        <div className={styles.transcriptPanel}>
          <div className={styles.transcriptHeader}>
            <span className={styles.transcriptTitle}>
              {chatMessages[chatMessages.length - 1]?.agent_emoji || "🤖"} {chatMessages[chatMessages.length - 1]?.agent_label || agentName}
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
          <div className="labChatInputArea" style={{ background: 'rgba(10, 14, 26, 0.8)', padding: '12px 24px', borderRadius: '99px', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              className={`labChatMicBtn ${isListening ? 'labChatMicBtnActive' : ''}`}
              onClick={startListeningPro}
              disabled={chatLoading}
              title={`Speak to ${agentName}`}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button className="labChatMicBtn" title="Capture Photo">
              <Camera size={18} />
            </button>
            <button className="labChatMicBtn" title="Upload Image" onClick={() => fileInputRef.current?.click()}>
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
                  if (e.key === "Enter") sendChatPro();
                }}
                placeholder={isListening ? "Listening... Speak now!" : `Type your message to ${agentName}...`}
                className="labChatInput"
                style={{ border: 'none', background: 'transparent', boxShadow: 'none', width: '100%' }}
                disabled={chatLoading}
              />
            </div>
            <button 
              onClick={() => sendChatPro()} 
              className="labChatSendBtn"
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
