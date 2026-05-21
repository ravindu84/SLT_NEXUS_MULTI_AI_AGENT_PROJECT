"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const AudioContext = createContext();

export function AudioProvider({ children }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // If we land on a restricted or protected page without interacting yet, 
    // the audio might block autoplay unless we explicitly handle it via user click.
    // So we provide global methods for components to trigger play.
  }, []);

  const playMusic = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn("Audio play blocked by browser:", err);
      });
    }
  };

  const pauseMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <AudioContext.Provider value={{ isPlaying, playMusic, pauseMusic }}>
      <audio 
        ref={audioRef} 
        src="/assets/background-music.mp3" 
        loop 
        preload="auto" 
      />
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => useContext(AudioContext);
