"use client";

import { useState, useRef, useCallback } from "react";
import styles from "../page.module.css";

const API_URL = "http://localhost:8000";

/**
 * ChatPanel — The chat interface panel alongside the 3D avatar.
 */
export default function ChatPanel({
  onSpeakingChange,
  onThinkingChange,
  onAudioLevelChange,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // --- Accessibility Hand Gesture Recognition (Simulated MediaPipe Tracker) ---
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [gestureStatus, setGestureStatus] = useState("No hand detected");
  const [confidence, setConfidence] = useState(0);
  const [activeGesture, setActiveGesture] = useState(null);
  const [jointOffsets, setJointOffsets] = useState([
    { x: 50, y: 40 },
    { x: 42, y: 30 },
    { x: 58, y: 55 },
    { x: 48, y: 20 },
  ]);
  const videoRef = useRef(null);

  const toggleCamera = async () => {
    if (isCameraOn) {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      setCameraStream(null);
      setIsCameraOn(false);
      setGestureStatus("No hand detected");
      setConfidence(0);
      setActiveGesture(null);
      setJointOffsets([
        { x: 50, y: 40 },
        { x: 42, y: 30 },
        { x: 58, y: 55 },
        { x: 48, y: 20 },
      ]);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStream(stream);
        setIsCameraOn(true);
        setGestureStatus("MediaPipe Initializing...");
        setConfidence(0);
        
        // Wait for video element to mount
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          simulateTracking();
        }, 300);
      } catch (err) {
        console.warn("Webcam access denied or unavailable:", err);
        alert("කරුණාකර කැමරාව ක්‍රියාත්මක කිරීමට වෙබ්කැම් අවසරය ලබා දෙන්න!");
      }
    }
  };

  const simulateTracking = () => {
    const statuses = [
      "Detecting hands...",
      "Tracking hand joints...",
      "MediaPipe: 21 Landmarks active",
      "Joint confidence: 99.1%",
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (!videoRef.current) {
        clearInterval(interval);
        return;
      }
      setGestureStatus(statuses[i % statuses.length]);
      setConfidence(Math.floor(Math.random() * 5) + 95);
      i++;
    }, 2500);

    // Active drift loop to make hand skeleton drift & dance to simulate camera AI tracking in real-time
    const driftInterval = setInterval(() => {
      if (!videoRef.current) {
        clearInterval(driftInterval);
        return;
      }
      setJointOffsets((prev) =>
        prev.map((joint) => {
          const dx = (Math.random() * 2 - 1) * 0.9;
          const dy = (Math.random() * 2 - 1) * 0.9;
          // Keep joints within webcam box boundaries safely
          return {
            x: Math.max(30, Math.min(70, joint.x + dx)),
            y: Math.max(15, Math.min(80, joint.y + dy)),
          };
        })
      );
    }, 150);
  };

  const triggerGesture = (gestureName, queryText) => {
    setActiveGesture(gestureName);
    setGestureStatus(`Gesture recognized: ${gestureName}!`);
    sendMessage(queryText);
    setTimeout(() => {
      setActiveGesture(null);
    }, 2000);
  };

  const activateDeafMode = async () => {
    // 1. Automatically turn on the camera
    if (!isCameraOn) {
      await toggleCamera();
    }
    // 2. Send the accessibility greeting query
    sendMessage("Accessibility mode, sign language ඉගෙන ගන්න ඕන");
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
          body: JSON.stringify({ text: text.slice(0, 500) }),
        });

        if (!response.ok) {
          console.warn("TTS unavailable, skipping voice");
          return;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.pause();
        }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        // Audio analysis for avatar animation
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
          onAudioLevelChange?.(avg / 255);
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };

        audio.onplay = () => {
          onSpeakingChange?.(true);
          updateLevel();
        };

        audio.onended = () => {
          onSpeakingChange?.(false);
          onAudioLevelChange?.(0);
          cancelAnimationFrame(animFrameRef.current);
          audioContext.close();
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          onSpeakingChange?.(false);
          onAudioLevelChange?.(0);
        };

        await audio.play();
      } catch (err) {
        console.warn("TTS error:", err);
        onSpeakingChange?.(false);
      }
    },
    [isMuted, onSpeakingChange, onAudioLevelChange]
  );

  // Send message
  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    setInput("");
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    onThinkingChange?.(true);

    setTimeout(scrollToBottom, 50);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true"
        },
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

      // Speak the response
      speak(data.response);
    } catch (error) {
      const errorMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content:
          "⚠️ Could not connect to the server. Make sure the backend is running on port 8000.",
        agent_emoji: "⚠️",
        agent_label: "System",
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      onThinkingChange?.(false);
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
    if (audioRef.current) audioRef.current.pause();
    onSpeakingChange?.(false);
    onAudioLevelChange?.(0);
  };

  const AGENTS = {
    liya_agent: { color: "#2684ff", bg: "rgba(38,132,255,0.12)" },
    signa_agent: { color: "#e91e63", bg: "rgba(233,30,99,0.12)" },
    oracle_agent: { color: "#9c27b0", bg: "rgba(156,39,176,0.12)" },
    pathfinder_agent: { color: "#ff6d00", bg: "rgba(255,109,0,0.12)" },
    pulse_agent: { color: "#00c853", bg: "rgba(0,200,83,0.12)" },
    insight_agent: { color: "#00bcd4", bg: "rgba(0,188,212,0.12)" },
    spark_agent: { color: "#ffab00", bg: "rgba(255,171,0,0.12)" },
    guardian_agent: { color: "#ff3d57", bg: "rgba(255,61,87,0.12)" },
    vault_agent: { color: "#607d8b", bg: "rgba(96,125,139,0.12)" },
    provisioner_agent: { color: "#03a9f4", bg: "rgba(3,169,244,0.12)" },
    analyzer_agent: { color: "#4caf50", bg: "rgba(76,175,80,0.12)" },
    messenger_agent: { color: "#ff5722", bg: "rgba(255,87,34,0.12)" },
    general_agent: { color: "#2684ff", bg: "rgba(38,132,255,0.12)" },
  };

  const QUICK_PROMPTS = [
    { text: "What's the best fiber package?", emoji: "📦" },
    { text: "My internet is not working", emoji: "🔧" },
    { text: 'Is this a scam: "You won Rs.500,000"', emoji: "🛡️" },
    { text: "Hello LIYA!", emoji: "👋" },
  ];

  return (
    <div className={styles.chatPanel}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          <div className={styles.statusDot}></div>
          <span className={styles.chatTitle}>LIYA AI Assistant</span>
        </div>
        <div className={styles.chatHeaderActions}>
          <button
            className={styles.iconBtn}
            onClick={toggleCamera}
            style={{
              color: isCameraOn ? '#e91e63' : 'inherit',
              border: isCameraOn ? '1px solid rgba(233,30,99,0.4)' : 'none',
              borderRadius: '4px',
              padding: '2px 6px',
              marginRight: '6px',
              backgroundColor: isCameraOn ? 'rgba(233,30,99,0.1)' : 'transparent',
              fontSize: '14px',
              cursor: 'pointer',
            }}
            title="Accessibility Mode (Gestures / MediaPipe)"
          >
            📷
          </button>
          <button
            className={styles.iconBtn}
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          <button className={styles.iconBtn} onClick={newChat} title="New Chat">
            ✨
          </button>
        </div>
      </div>

      {/* MediaPipe Gesture Recognition Webcam Simulator Panel */}
      {isCameraOn && (
        <div style={{
          position: 'relative',
          margin: '10px 15px',
          padding: '12px',
          background: 'rgba(10, 14, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(233, 30, 99, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(233, 30, 99, 0.15), inset 0 0 12px rgba(233, 30, 99, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 50,
        }}>
          {/* Webcam View and Overlay Mesh */}
          <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            {/* Neon MediaPipe Joint mesh overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              border: '2px solid rgba(233, 30, 99, 0.4)',
              borderRadius: '12px',
              boxShadow: 'inset 0 0 20px rgba(233, 30, 99, 0.2)',
            }}>
              {/* Glowing Hand skeleton dots simulation using CSS */}
              <div style={{
                position: 'absolute',
                top: `${jointOffsets[0]?.y}%`,
                left: `${jointOffsets[0]?.x}%`,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#e91e63',
                boxShadow: '0 0 10px #e91e63, 0 0 20px #e91e63',
                transition: 'all 0.15s ease-out',
              }} />
              <div style={{
                position: 'absolute',
                top: `${jointOffsets[1]?.y}%`,
                left: `${jointOffsets[1]?.x}%`,
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#00bcd4',
                boxShadow: '0 0 8px #00bcd4',
                transition: 'all 0.15s ease-out',
              }} />
              <div style={{
                position: 'absolute',
                top: `${jointOffsets[2]?.y}%`,
                left: `${jointOffsets[2]?.x}%`,
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#00bcd4',
                boxShadow: '0 0 8px #00bcd4',
                transition: 'all 0.15s ease-out',
              }} />
              <div style={{
                position: 'absolute',
                top: `${jointOffsets[3]?.y}%`,
                left: `${jointOffsets[3]?.x}%`,
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#00e676',
                boxShadow: '0 0 8px #00e676',
                transition: 'all 0.15s ease-out',
              }} />
              {/* Connecting lines simulation */}
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                <line x1={`${jointOffsets[1]?.x}%`} y1={`${jointOffsets[1]?.y}%`} x2={`${jointOffsets[0]?.x}%`} y2={`${jointOffsets[0]?.y}%`} stroke="rgba(233,30,99,0.5)" strokeWidth="1.5" />
                <line x1={`${jointOffsets[3]?.x}%`} y1={`${jointOffsets[3]?.y}%`} x2={`${jointOffsets[1]?.x}%`} y2={`${jointOffsets[1]?.y}%`} stroke="rgba(233,30,99,0.5)" strokeWidth="1.5" />
                <line x1={`${jointOffsets[0]?.x}%`} y1={`${jointOffsets[0]?.y}%`} x2={`${jointOffsets[2]?.x}%`} y2={`${jointOffsets[2]?.y}%`} stroke="rgba(233,30,99,0.5)" strokeWidth="1.5" />
              </svg>
            </div>
            {/* Badge */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: 'rgba(233,30,99,0.85)',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '9px',
              fontWeight: 'bold',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              boxShadow: '0 0 10px rgba(233,30,99,0.5)'
            }}>
              🔴 MediaPipe Active
            </div>
          </div>

          {/* Telemetry Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '8px', color: '#8a99ad', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tracking Status</span>
              <span style={{ fontSize: '11px', color: 'white', fontWeight: 'bold' }}>{gestureStatus}</span>
            </div>
            {confidence > 0 && (
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '8px', color: '#8a99ad', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joint Confidence</span>
                <span style={{ fontSize: '11px', color: '#00e676', fontWeight: 'bold' }}>{confidence}%</span>
              </div>
            )}
          </div>

          {/* Quick Gesture Trigger Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
            <span style={{ fontSize: '8px', color: '#8a99ad', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Perform gesture (Simulated Kiosk Inputs):</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              <button
                onClick={() => triggerGesture("👋 HELLO", "Accessibility mode, sign language ඉගෙන ගන්න ඕන")}
                style={{
                  background: 'rgba(233, 30, 99, 0.15)',
                  border: '1px solid rgba(233, 30, 99, 0.3)',
                  color: 'white',
                  padding: '6px',
                  borderRadius: '8px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.target.style.background = 'rgba(233, 30, 99, 0.3)'; }}
                onMouseLeave={(e) => { e.target.style.background = 'rgba(233, 30, 99, 0.15)'; }}
              >
                👋 Hello Gesture
              </button>
              <button
                onClick={() => triggerGesture("🔧 FAULT", "මගේ router එකේ internet වැඩ කරන්නේ නැහැ, lights check කරන්න")}
                style={{
                  background: 'rgba(0, 200, 83, 0.15)',
                  border: '1px solid rgba(0, 200, 83, 0.3)',
                  color: 'white',
                  padding: '6px',
                  borderRadius: '8px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.target.style.background = 'rgba(0, 200, 83, 0.3)'; }}
                onMouseLeave={(e) => { e.target.style.background = 'rgba(0, 200, 83, 0.15)'; }}
              >
                🔧 Fault Sign
              </button>
              <button
                onClick={() => triggerGesture("🛡️ SCAM", "ලොතරැයියක් දිනුම් කියලා message එකක් ආවා, මේක scam එකක්ද?")}
                style={{
                  background: 'rgba(255, 61, 87, 0.15)',
                  border: '1px solid rgba(255, 61, 87, 0.3)',
                  color: 'white',
                  padding: '6px',
                  borderRadius: '8px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.target.style.background = 'rgba(255, 61, 87, 0.3)'; }}
                onMouseLeave={(e) => { e.target.style.background = 'rgba(255, 61, 87, 0.15)'; }}
              >
                🛡️ Scam Sign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={styles.chatMessages}>
        {messages.length === 0 ? (
          <div className={styles.chatEmpty}>
            <p className={styles.chatEmptyTitle}>Talk to LIYA</p>
            <p className={styles.chatEmptySubtitle}>
              Ask about packages, troubleshoot issues, or check for scams
            </p>
            
            {/* Highly prominent B2C Accessibility Mode Trigger Button */}
            <button
              onClick={activateDeafMode}
              style={{
                width: '100%',
                maxWidth: '280px',
                margin: '12px auto 20px auto',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #e91e63, #9c27b0)',
                border: 'none',
                borderRadius: '25px',
                color: 'white',
                fontSize: '11px',
                fontWeight: '900',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                boxShadow: '0 4px 15px rgba(233, 30, 99, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => { e.target.style.transform = 'scale(1.05)'; e.target.style.boxShadow = '0 6px 20px rgba(233, 30, 99, 0.6)'; }}
              onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 4px 15px rgba(233, 30, 99, 0.4)'; }}
            >
              <span>💗</span> Deaf & Mute / සංඥා භාෂා සහය
            </button>

            <div className={styles.quickPrompts}>
              {QUICK_PROMPTS.map((q, i) => (
                <button
                  key={i}
                  className={styles.quickPrompt}
                  onClick={() => sendMessage(q.text)}
                >
                  <span>{q.emoji}</span> {q.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const agentStyle = AGENTS[msg.agent_used] || AGENTS.general_agent;
              return (
                <div
                  key={msg.id}
                  className={`${styles.chatMsg} ${
                    msg.role === "user"
                      ? styles.chatMsgUser
                      : styles.chatMsgAssistant
                  } ${msg.isError ? styles.chatMsgError : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className={styles.agentBadge} style={{ background: agentStyle.bg, color: agentStyle.color }}>
                      {msg.agent_emoji} {msg.agent_label}
                    </div>
                  )}
                  <div className={styles.chatMsgContent}>
                    {msg.content.split("\n").map((line, i) => (
                      <span key={i}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </div>
                  <span className={styles.chatMsgTime}>
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
            {isLoading && (
              <div className={`${styles.chatMsg} ${styles.chatMsgAssistant}`}>
                <div className={styles.agentBadge} style={{ background: "rgba(38,132,255,0.12)", color: "#2684ff" }}>
                  🤔 Thinking...
                </div>
                <div className={styles.typingIndicator}>
                  <div className={styles.typingDot}></div>
                  <div className={styles.typingDot}></div>
                  <div className={styles.typingDot}></div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.chatInputArea}>
        <div className={styles.chatInputContainer}>
          <textarea
            className={styles.chatInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            rows={1}
            disabled={isLoading}
          />
          <button
            className={styles.chatSendBtn}
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <span className={styles.sendSpinner}></span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 2L11 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 2L15 22L11 13L2 9L22 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
