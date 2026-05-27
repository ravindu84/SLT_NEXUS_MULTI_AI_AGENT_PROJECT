import { useEffect, useRef, useState } from 'react';

export default function AudioAmbience() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // We need to keep track of oscillators to stop them if needed
  const nodesRef = useRef<any[]>([]);

  const startAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (isPlaying) {
      // Toggle off
      nodesRef.current.forEach(node => {
          try { node.stop(); } catch(e) {}
          try { node.disconnect(); } catch(e) {}
      });
      nodesRef.current = [];
      setIsPlaying(false);
      return;
    }

    const ctx = audioCtxRef.current;
    
    // 1. Low drone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, ctx.currentTime); // Low A
    
    // 2. Sub bass
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(27.5, ctx.currentTime);

    // Filter for drone
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);

    // LFO for filter sweep
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.05, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(100, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    // 3. Noise for neon buzz
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(60, ctx.currentTime); // 60Hz hum
    noiseFilter.Q.setValueAtTime(10, ctx.currentTime);
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, ctx.currentTime);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);

    // Mix and Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.4, ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(masterGain); 
    filter.connect(masterGain);
    noiseGain.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    noiseSource.start();

    nodesRef.current = [osc1, osc2, lfo, noiseSource, masterGain];

    setIsPlaying(true);
  };

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          nodesRef.current.forEach(node => {
              try { node.stop(); } catch(e) {}
              try { node.disconnect(); } catch(e) {}
          });
      };
  }, []);

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <button 
        onClick={startAudio} 
        className={`px-6 py-2 rounded-full shadow-lg text-xs font-mono uppercase tracking-widest transition-all backdrop-blur-md border ${
            isPlaying 
            ? 'bg-cyan-900/40 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:bg-cyan-900/60' 
            : 'bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-500/50 shadow-[0_0_15px_rgba(255,0,255,0.3)] hover:bg-fuchsia-900/60'
        }`}
      >
        {isPlaying ? '■ AMBIENCE ACTIVE' : '▶ ENABLE AMBIENCE'}
      </button>
    </div>
  );
}
