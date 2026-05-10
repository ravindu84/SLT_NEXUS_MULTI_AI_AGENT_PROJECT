"use client";

import { useRef, useEffect, useCallback } from "react";
import styles from "./TechBackground.module.css";

export default function TechBackground() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);

  // Create particles
  const initParticles = useCallback((width, height) => {
    const particles = [];
    const count = Math.floor((width * height) / 8000); // higher density for more particles
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.8 + 0.5,
        speedY: -(Math.random() * 0.4 + 0.1), // drift upward
        speedX: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.7 + 0.3,
        pulse: Math.random() * Math.PI * 2, // phase offset for pulsing
        pulseSpeed: Math.random() * 0.02 + 0.005,
      });
    }
    return particles;
  }, []);

  // Draw grid lines
  const drawGrid = useCallback((ctx, width, height, time) => {
    const gridSpacing = 60;
    const horizonY = height * 0.35; // perspective vanishing point

    // Horizontal floor grid lines (perspective)
    ctx.strokeStyle = "rgba(38, 132, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let y = horizonY; y < height; y += gridSpacing * 0.8) {
      const progress = (y - horizonY) / (height - horizonY);
      const alpha = 0.04 + progress * 0.08;
      ctx.strokeStyle = `rgba(38, 132, 255, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical converging lines (perspective toward center)
    const centerX = width * 0.5;
    const numLines = 16;
    for (let i = -numLines; i <= numLines; i++) {
      const bottomX = centerX + i * gridSpacing * 1.5;
      const topX = centerX + i * gridSpacing * 0.1;
      const alpha = 0.03 + Math.abs(i) * 0.004;
      ctx.strokeStyle = `rgba(38, 132, 255, ${Math.min(alpha, 0.10)})`;
      ctx.beginPath();
      ctx.moveTo(topX, horizonY);
      ctx.lineTo(bottomX, height);
      ctx.stroke();
    }

    // Animated horizontal scan line
    const scanY = horizonY + ((time * 0.02) % (height - horizonY));
    const scanGrad = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
    scanGrad.addColorStop(0, "rgba(0, 212, 255, 0)");
    scanGrad.addColorStop(0.5, "rgba(0, 212, 255, 0.12)");
    scanGrad.addColorStop(1, "rgba(0, 212, 255, 0)");
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 2, width, 4);
  }, []);

  // Draw particles
  const drawParticles = useCallback((ctx, particles, width, height, time) => {
    particles.forEach((p) => {
      // Update position
      p.y += p.speedY;
      p.x += p.speedX;
      p.pulse += p.pulseSpeed;

      // Wrap around
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      // Pulsing glow
      const pulse = Math.sin(p.pulse) * 0.3 + 0.7;
      const alpha = p.opacity * pulse;

      // Draw particle with glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(38, 132, 255, ${alpha})`;
      ctx.fill();

      // Glow effect
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(38, 132, 255, ${alpha * 0.15})`;
      ctx.fill();
    });
  }, []);

  // Draw data stream lines (vertical falling lines like subtle matrix)
  const drawDataStreams = useCallback((ctx, width, height, time) => {
    const numStreams = 8;
    for (let i = 0; i < numStreams; i++) {
      const x = (width / (numStreams + 1)) * (i + 1) + Math.sin(time * 0.001 + i) * 20;
      const streamLen = 60 + Math.sin(time * 0.002 + i * 1.5) * 30;
      const y = ((time * 0.3 + i * 200) % (height + streamLen * 2)) - streamLen;

      const grad = ctx.createLinearGradient(x, y, x, y + streamLen);
      grad.addColorStop(0, "rgba(0, 212, 255, 0)");
      grad.addColorStop(0.5, "rgba(0, 212, 255, 0.08)");
      grad.addColorStop(1, "rgba(0, 212, 255, 0)");

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + streamLen);
      ctx.stroke();
    }
  }, []);

  // Draw connection lines between nearby particles
  const drawConnections = useCallback((ctx, particles) => {
    const maxDist = 120;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.06;
          ctx.strokeStyle = `rgba(38, 132, 255, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let time = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.scale(dpr, dpr);
      particlesRef.current = initParticles(rect.width, rect.height);
    };

    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      time++;
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      // Draw all layers
      drawGrid(ctx, w, h, time);
      drawDataStreams(ctx, w, h, time);
      drawParticles(ctx, particlesRef.current, w, h, time);
      drawConnections(ctx, particlesRef.current);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [initParticles, drawGrid, drawParticles, drawDataStreams, drawConnections]);

  return (
    <div className={styles.techBg}>
      {/* Canvas for animated particles, grid, and data streams */}
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      {/* Hexagonal pattern overlay */}
      <div className={styles.hexOverlay} />

      {/* Central blue glow halo behind avatar */}
      <div className={styles.glowHalo} />
      <div className={styles.glowHaloInner} />

      {/* Animated wave at the bottom */}
      <svg className={styles.waveSvg} viewBox="0 0 1440 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0, 82, 204, 0.3)" />
            <stop offset="50%" stopColor="rgba(0, 212, 255, 0.2)" />
            <stop offset="100%" stopColor="rgba(0, 82, 204, 0.3)" />
          </linearGradient>
        </defs>
        <path className={styles.wave1} fill="url(#waveGrad)" />
        <path className={styles.wave2} fill="rgba(0, 212, 255, 0.06)" />
      </svg>

      {/* Side accent lines */}
      <div className={styles.sideAccentLeft} />
      <div className={styles.sideAccentRight} />

      {/* Corner tech brackets */}
      <div className={`${styles.cornerBracket} ${styles.cornerTL}`} />
      <div className={`${styles.cornerBracket} ${styles.cornerTR}`} />
      <div className={`${styles.cornerBracket} ${styles.cornerBL}`} />
      <div className={`${styles.cornerBracket} ${styles.cornerBR}`} />
    </div>
  );
}
