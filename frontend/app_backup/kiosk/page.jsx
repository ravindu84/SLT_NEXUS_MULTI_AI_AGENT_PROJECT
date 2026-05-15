'use client';

import React, { useState } from 'react';
import VRTeleshop from '../components/nexus/VRTeleshop';
import { Mic, MicOff, MessageSquare } from 'lucide-react';

export default function KioskPage() {
  const [isListening, setIsListening] = useState(false);

  return (
    <main className="w-full h-screen bg-black overflow-hidden relative">
      {/* 3D LIYA Avatar View */}
      <div className="absolute inset-0">
        <VRTeleshop isKiosk={true} />
      </div>

      {/* Kiosk Overlay */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-6">
        <div className="text-center mb-4">
          <h1 className="text-5xl font-black text-white italic tracking-tighter">LIYA</h1>
          <p className="text-slt-blue font-bold tracking-widest uppercase text-sm">SLT Smart Assistant</p>
        </div>

        <button 
          onClick={() => setIsListening(!isListening)}
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl ${
            isListening 
            ? 'bg-red-500 shadow-red-500/50 scale-110 animate-pulse' 
            : 'bg-slt-blue shadow-blue-500/50 hover:scale-105'
          }`}
        >
          {isListening ? <MicOff size={48} color="white" /> : <Mic size={48} color="white" />}
        </button>

        <p className="text-white/60 font-medium animate-bounce">
          {isListening ? "Listening..." : "Tap to Speak"}
        </p>
      </div>

      {/* Language Toggle */}
      <div className="absolute top-10 right-10 flex gap-4">
        {['EN', 'SI', 'TA'].map(l => (
          <div key={l} className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white font-bold backdrop-blur-md">
            {l}
          </div>
        ))}
      </div>
    </main>
  );
}