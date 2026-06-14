import { useState, useRef, useCallback } from 'react';

export function useGeminiLiveAPI({ systemInstruction, language = "si", voiceName = "Aoede", isAdmin = false, sessionId = "0712345678", onTextResponse }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioInputRef = useRef(null);
  const microphoneRef = useRef(null);
  const streamRef = useRef(null);
  const nextPlaybackTimeRef = useRef(0);
  const activeSourcesRef = useRef([]); 
  const accumulatedTextRef = useRef("");

  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const systemInstructionRef = useRef(systemInstruction);
  useEffect(() => {
    systemInstructionRef.current = systemInstruction;
  }, [systemInstruction]);

  const stopAllAudio = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    activeSourcesRef.current = [];
    nextPlaybackTimeRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const disconnect = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioInputRef.current) {
      audioInputRef.current.disconnect();
      audioInputRef.current = null;
    }
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    stopAllAudio();
    setIsConnected(false);
    setAudioLevel(0);
  }, [stopAllAudio]);

  const playAudioChunk = useCallback((base64) => {
    if (!audioContextRef.current) return;
    const audioContext = audioContextRef.current;
    
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    
    const int16Array = new Int16Array(buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 0x8000;
    }
    
    const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    if (analyserRef.current) {
      source.connect(analyserRef.current);
    } else {
      source.connect(audioContext.destination);
    }
    
    if (nextPlaybackTimeRef.current < audioContext.currentTime) {
      nextPlaybackTimeRef.current = audioContext.currentTime + 0.05;
    }
    source.start(nextPlaybackTimeRef.current);
    nextPlaybackTimeRef.current += audioBuffer.duration;
    
    activeSourcesRef.current.push(source);
    setIsSpeaking(true);
    
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
      if (activeSourcesRef.current.length === 0) {
        setIsSpeaking(false);
      }
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      streamRef.current = stream;
      
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.connect(audioContextRef.current.destination);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel((avg / 255) * 3.2);
        }
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
      
      const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!API_KEY) {
        throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY in environment");
      }

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("Gemini Live WebSocket Connected");
        setIsConnected(true);
        wsRef.current.send(JSON.stringify({
            setup: {
              model: "models/gemini-3.1-flash-live-preview",
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: voiceName
                    }
                  }
                }
              },
              systemInstruction: {
                parts: [{ text: systemInstructionRef.current }]
              },
              tools: [{
              functionDeclarations: [
                {
                  name: "consult_slt_expert_system",
                  description: "Query the SLT-MOBITEL LangGraph AI Agent. Use this for questions about Peo TV, Packages, Bill Payment, NXC Coins, Blockchain, Technical Faults, Tickets, Scam detection, and ANY general SLT knowledgebase info.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      query: { type: "STRING", description: "The exact question to ask the AI agent" }
                    },
                    required: ["query"]
                  }
                },
                {
                  name: "check_account_details",
                  description: "INSTANTLY fetch the user's current bill, remaining data balance, 3-month billing history, and 31-day daily usage logs (Facebook, YouTube, Google, etc.). ALWAYS use this for questions about Bills or Data Usage.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      phone_number: { type: "STRING", description: "The customer's phone number" },
                      query_type: { type: "STRING", description: "What the user wants to know: 'bill' (current bill only), 'usage' (current data usage only), 'history' (3 month bill history), 'daily' (31 days usage logs), or 'all'" }
                    },
                    required: ["phone_number", "query_type"]
                  }
                }
              ]
            }]
          }
        }));
        
        microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        
        processor.onaudioprocess = (e) => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = new Int16Array(Math.floor(inputData.length * 2 / 3));
            let pcmIndex = 0;
            for (let i = 0; i < inputData.length; i += 3) {
                if (pcmIndex < pcmData.length) {
                    let s1 = Math.max(-1, Math.min(1, inputData[i]));
                    pcmData[pcmIndex++] = s1 < 0 ? s1 * 0x8000 : s1 * 0x7FFF;
                }
                if (i + 1 < inputData.length && pcmIndex < pcmData.length) {
                    let s2 = Math.max(-1, Math.min(1, inputData[i + 1]));
                    pcmData[pcmIndex++] = s2 < 0 ? s2 * 0x8000 : s2 * 0x7FFF;
                }
            }
            // Calculate RMS volume to determine if someone is speaking
            let sumSquares = 0;
            for (let i = 0; i < pcmData.length; i++) {
              sumSquares += pcmData[i] * pcmData[i];
            }
            const rms = Math.sqrt(sumSquares / pcmData.length);
            
            // Only send audio if it passes a basic noise gate threshold (e.g., > 100 on a 0-32767 scale)
            if (rms > 100) {
              const buffer = new Uint8Array(pcmData.buffer);
              let binary = '';
              for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
              }
              const base64 = btoa(binary);
              
              wsRef.current.send(JSON.stringify({
                realtimeInput: {
                  audio: {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64
                  }
                }
              }));
            }
          }
        };
        
        microphoneRef.current.connect(processor);
        const silentGain = audioContextRef.current.createGain();
        silentGain.gain.value = 0;
        processor.connect(silentGain);
        silentGain.connect(audioContextRef.current.destination);
        audioInputRef.current = processor;
      };
      
      wsRef.current.onmessage = async (event) => {
        try {
          let textData = event.data;
          if (event.data instanceof Blob) {
            textData = await event.data.text();
          }
          const data = JSON.parse(textData);
          if (data.toolCall) {
            const calls = data.toolCall.functionCalls;
            for (const call of calls) {
              console.log("Gemini requested function:", call.name, call.args);
              
              if (call.name === "consult_slt_expert_system") {
                try {
                  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                  
                  const payload = { 
                    message: isAdmin ? call.args.query : `${call.args.query} (My phone number is ${sessionId})`, 
                    is_admin: isAdmin, 
                    session_id: sessionId 
                  };
                  
                  if (typeof window !== 'undefined' && window.__attachedImage) {
                    payload.image_base64 = window.__attachedImage.split(',')[1];
                  }

                  const res = await fetch(`${API_BASE}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                  });
                  const resData = await res.json();
                  
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      toolResponse: {
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { result: resData.response || "No data found." }
                        }]
                      }
                    }));
                  }
                } catch (e) {
                  console.error("Expert system tool failed", e);
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      toolResponse: {
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { result: "System is temporarily busy. Please try asking again in a moment." }
                        }]
                      }
                    }));
                  }
                }
              } else if (call.name === "check_account_details") {
                try {
                  const phoneToUse = sessionId || call.args.phone_number || "0112895800";
                  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                  const res = await fetch(`${API_BASE}/api/account/${phoneToUse}`);
                  const resData = await res.json();
                  let filteredData = { phone_number: resData.phone_number, customer_name: resData.customer_name };
                  const qType = call.args.query_type || 'all';
                  if (qType === 'bill') filteredData.billing = resData.billing;
                  else if (qType === 'usage') filteredData.data_usage = resData.data_usage;
                  else if (qType === 'history') filteredData.billing_history = resData.billing_history;
                  else if (qType === 'daily') filteredData.daily_logs = resData.daily_logs;
                  else filteredData = resData; // fallback to all
                  
                  console.log("[Tool] Account data for", phoneToUse, "type:", qType, filteredData);
                  
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      toolResponse: {
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: filteredData
                        }]
                      }
                    }));
                  }
                } catch (e) {
                  console.error("Account tool failed", e);
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      toolResponse: {
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { error: "Could not fetch account details. Please try again." }
                        }]
                      }
                    }));
                  }
                }
              } else {
                console.log("Unknown tool call", call.name);
              }
            }
          }

          if (data.serverContent?.modelTurn) {
            const parts = data.serverContent.modelTurn.parts;
            for (const part of parts) {
              if (part.inlineData && part.inlineData.mimeType.startsWith("audio/pcm")) {
                playAudioChunk(part.inlineData.data);
              } else if (part.text) {
                accumulatedTextRef.current += part.text;
              }
            }
          }
          if (data.serverContent?.interrupted) {
            console.log("Gemini Interrupted!");
            stopAllAudio();
            accumulatedTextRef.current = "";
          }
          if (data.serverContent?.turnComplete) {
            if (accumulatedTextRef.current && onTextResponse) {
              onTextResponse(accumulatedTextRef.current);
              accumulatedTextRef.current = "";
            }
          }
        } catch (err) {
          console.error("Error parsing Gemini message", err);
        }
      };
      
      wsRef.current.onerror = (e) => {
        console.error("Gemini WS Error", e);
        setError("WebSocket Error occurred.");
        alert("WebSocket Error. Is the API Key correct?");
      };
      
      wsRef.current.onclose = (event) => {
        console.log("Gemini Live API Disconnected", event.code, event.reason);
        if (event.code !== 1000) {
           setError(`Disconnected: ${event.code} ${event.reason}`);
        }
        setIsConnected(false);
        disconnect();
      };
      
    } catch (e) {
      console.error("Failed to connect to Gemini", e);
      setError(e.message);
      alert("Error: " + e.message);
    }
  }, [systemInstruction, disconnect, playAudioChunk, stopAllAudio]);

  const sendImage = useCallback((base64Data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: "image/jpeg",
            data: base64Data
          }]
        }
      }));
    }
  }, []);

  return { connect, disconnect, isConnected, isSpeaking, audioLevel, error, sendImage };
}
