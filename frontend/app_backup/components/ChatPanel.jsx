"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import styles from "../page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Listen for voice input from the avatar page
  const sendMessageRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (e.detail && sendMessageRef.current) {
        sendMessageRef.current(e.detail);
      }
    };
    window.addEventListener("voice-input", handler);
    return () => window.removeEventListener("voice-input", handler);
  }, []);

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
      const response = await fetch(`${API_URL}/chat`, {
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

  // Wire up ref for voice input
  sendMessageRef.current = sendMessage;

  const newChat = () => {
    setMessages([]);
    setSessionId(null);
    if (audioRef.current) audioRef.current.pause();
    onSpeakingChange?.(false);
    onAudioLevelChange?.(0);
  };

  const AGENTS = {
    sales_agent: { color: "#2684ff", bg: "rgba(38,132,255,0.12)" },
    tech_support_agent: { color: "#00c853", bg: "rgba(0,200,83,0.12)" },
    scam_detector_agent: { color: "#ff3d57", bg: "rgba(255,61,87,0.12)" },
    general_agent: { color: "#ffab00", bg: "rgba(255,171,0,0.12)" },
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

      {/* Messages */}
      <div className={styles.chatMessages}>
        {messages.length === 0 ? (
          <div className={styles.chatEmpty}>
            <p className={styles.chatEmptyTitle}>Talk to LIYA</p>
            <p className={styles.chatEmptySubtitle}>
              Ask about packages, troubleshoot issues, or check for scams
            </p>
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
