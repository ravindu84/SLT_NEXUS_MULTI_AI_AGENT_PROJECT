/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, useState, useEffect, Component, ReactNode } from 'react';
import Scene from './components/Scene';
import AudioAmbience from './components/AudioAmbience';

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: any}> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any) {
    console.error("Crash detected:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute z-50 inset-0 flex flex-col p-10 bg-red-900 text-white overflow-auto font-mono text-sm leading-relaxed">
          <h1 className="text-xl font-bold mb-4">CRASH DETECTED</h1>
          <pre>{String(this.state.error?.stack || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [bannerText, setBannerText] = useState("SLT METAVERSE");

  useEffect(() => {
    // Simulating initial load
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-600 border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
        <h2 className="mt-6 text-xl font-bold tracking-[0.2em] uppercase text-cyan-400">Loading Environment...</h2>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden relative cursor-grab active:cursor-grabbing">
      <div className="absolute inset-0 z-0 text-white selection:bg-cyan-500">
        <ErrorBoundary>
          <Scene bannerText={bannerText} />
        </ErrorBoundary>
      </div>
      
      <AudioAmbience />

      {/* HUD (Heads Up Display) Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        <div className="flex justify-between items-start">
          <div className="bg-slate-900/80 backdrop-blur-md p-4 border-l-4 border-fuchsia-500 rounded-br-2xl shadow-2xl pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center bg-gradient-to-br from-fuchsia-700 to-purple-500 text-white font-bold rounded-lg w-12 h-12 text-xl shadow-inner shadow-black/50 border border-fuchsia-400/50">
                A
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <span className="font-black tracking-tight text-white text-2xl drop-shadow-md">
                  SLT <span className="text-cyan-400">METAVERSE</span>
                </span>
                <span className="text-slate-300 font-medium text-xs tracking-wider">
                  DRAG TO ROTATE
                </span>
              </div>
            </div>
          </div>
          
          {/* Controls Panel Removed */}
        </div>
      </div>
    </div>
  );
}
