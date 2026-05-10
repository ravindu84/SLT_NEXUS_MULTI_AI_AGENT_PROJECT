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
    const count = Math.floor((width * height) / 20000); // lower density for performance
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        speedY: -(Math.random() * 0.3 + 0.1), 
        speedX: (Math.random() - 0.5) * 0.15,
        opacity: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.01 + 0.005,
      });
    }
    return particles;
  }, []);

  // Draw grid lines
  const drawGrid = useCallback((ctx, width, height, time) => {
    const gridSpacing = 80;
    const horizonY = height * 0.4; 

    ctx.strokeStyle = "rgba(38, 132, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let y = horizonY; y < height; y += gridSpacing) {
      const progress = (y - horizonY) / (height - horizonY);
      const alpha = 0.02 + progress * 0.04;
      ctx.strokeStyle = `rgba(38, 132, 255, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, []);

  // Draw particles
  const drawParticles = useCallback((ctx, particles, width, height, time) => {
    particles.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.pulse += p.pulseSpeed;

      if (p.y < -10) p.y = height + 10;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      const pulse = Math.sin(p.pulse) * 0.2 + 0.8;
      const alpha = p.opacity * pulse;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(38, 132, 255, ${alpha})`;
      ctx.fill();
    });
  }, []);

  // Draw connection lines between nearby particles
  const drawConnections = useCallback((ctx, particles) => {
    const maxDist = 80;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.04;
          ctx.strokeStyle = `rgba(38, 132, 255, ${alpha})`;
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
      drawParticles(ctx, particlesRef.current, w, h, time);
      drawConnections(ctx, particlesRef.current);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [initParticles, drawGrid, drawParticles, drawConnections]);

  return (
    <div className={styles.techBg}>
      {/* Canvas for animated particles and connections */}
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      {/* Hexagonal pattern overlay - very subtle */}
      <div className={styles.hexOverlay} />
    </div>
  );
}
