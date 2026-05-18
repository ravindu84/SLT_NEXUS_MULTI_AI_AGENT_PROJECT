"use client";

import { useEffect, useRef } from "react";
import styles from "./InteractiveTechVisual.module.css";

export default function InteractiveTechVisual() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    let animationFrameId;
    let particles = [];
    let cubes = [];
    let pulses = [];
    let ripples = [];
    let time = 0;

    // Mouse tracking
    const mouse = {
      x: 0,
      y: 0,
      active: false,
      radius: 120, // Interaction radius
    };

    // Color definitions
    const COLORS = {
      blue: "rgba(38, 132, 255, ",
      teal: "rgba(0, 212, 170, ",
      purple: "rgba(167, 139, 250, ",
      white: "rgba(255, 255, 255, ",
    };

    // 3D Cube Vertices & Edges (Blockchain blocks)
    const CUBE_VERTICES = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1]
    ];

    const CUBE_EDGES = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Back face
      [4, 5], [5, 6], [6, 7], [7, 4], // Front face
      [0, 4], [1, 5], [2, 6], [3, 7]  // Connecting edges
    ];

    // Initialize 3D Cube objects
    const initCubes = (width, height) => {
      const items = [];
      // 3 on the left, 3 on the right
      const count = 3;
      
      for (let i = 0; i < count; i++) {
        // Left cubes
        items.push({
          x: Math.random() * (width * 0.25) + (width * 0.05),
          y: Math.random() * (height * 0.6) + (height * 0.2),
          z: Math.random() * 0.5 + 0.5,
          scale: Math.random() * 25 + 15,
          rotX: Math.random() * Math.PI,
          rotY: Math.random() * Math.PI,
          rotZ: Math.random() * Math.PI,
          rotSpeedX: (Math.random() - 0.5) * 0.01,
          rotSpeedY: (Math.random() - 0.5) * 0.015,
          rotSpeedZ: (Math.random() - 0.5) * 0.008,
          speedY: -(Math.random() * 0.2 + 0.05),
          pulseOffset: Math.random() * Math.PI * 2,
          color: i % 2 === 0 ? "teal" : "blue",
        });

        // Right cubes
        items.push({
          x: Math.random() * (width * 0.25) + (width * 0.7),
          y: Math.random() * (height * 0.6) + (height * 0.2),
          z: Math.random() * 0.5 + 0.5,
          scale: Math.random() * 25 + 15,
          rotX: Math.random() * Math.PI,
          rotY: Math.random() * Math.PI,
          rotZ: Math.random() * Math.PI,
          rotSpeedX: (Math.random() - 0.5) * 0.01,
          rotSpeedY: (Math.random() - 0.5) * 0.015,
          rotSpeedZ: (Math.random() - 0.5) * 0.008,
          speedY: -(Math.random() * 0.2 + 0.05),
          pulseOffset: Math.random() * Math.PI * 2,
          color: i % 2 === 0 ? "purple" : "blue",
        });
      }
      return items;
    };

    // Initialize constellation particles
    const initParticles = (width, height) => {
      const items = [];
      const density = 30; // 30 on each side
      
      // Left side particles
      for (let i = 0; i < density; i++) {
        items.push({
          x: Math.random() * (width * 0.35),
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 2.5 + 1.5,
          color: Math.random() > 0.5 ? "blue" : "teal",
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.03 + 0.01,
          side: "left",
          connections: [],
        });
      }

      // Right side particles
      for (let i = 0; i < density; i++) {
        items.push({
          x: Math.random() * (width * 0.35) + (width * 0.65),
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 2.5 + 1.5,
          color: Math.random() > 0.5 ? "purple" : "blue",
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.03 + 0.01,
          side: "right",
          connections: [],
        });
      }

      return items;
    };

    // 3D Math Rotations
    const rotate3D = (point, rotX, rotY, rotZ) => {
      let [x, y, z] = point;

      // X Rotation
      let cos = Math.cos(rotX), sin = Math.sin(rotX);
      let y1 = y * cos - z * sin;
      let z1 = y * sin + z * cos;

      // Y Rotation
      cos = Math.cos(rotY); sin = Math.sin(rotY);
      let x2 = x * cos + z1 * sin;
      let z2 = -x * sin + z1 * cos;

      // Z Rotation
      cos = Math.cos(rotZ); sin = Math.sin(rotZ);
      let x3 = x2 * cos - y1 * sin;
      let y3 = x2 * sin + y1 * cos;

      return [x3, y3, z2];
    };

    // Project 3D coordinate to 2D screen coordinate
    const project3D = (point, cx, cy, scale) => {
      const [x, y, z] = point;
      const distance = 3.0; // Distance of camera
      const fov = scale / (distance + z * 0.5);
      return [x * fov + cx, y * fov + cy];
    };

    // Draw rotating 3D wireframe cubes
    const drawCubes = (w, h) => {
      cubes.forEach((cube) => {
        // Move floating cube
        cube.y += cube.speedY;
        cube.rotX += cube.rotSpeedX;
        cube.rotY += cube.rotSpeedY;
        cube.rotZ += cube.rotSpeedZ;

        // Reset if out of top bound
        if (cube.y < -cube.scale * 2) {
          cube.y = h + cube.scale * 2;
          cube.x = cube.x < w * 0.5 
            ? Math.random() * (w * 0.25) + (w * 0.05) 
            : Math.random() * (w * 0.25) + (w * 0.7);
        }

        const opacity = 0.08 + Math.sin(time * 0.01 + cube.pulseOffset) * 0.04;
        ctx.strokeStyle = COLORS[cube.color] + opacity + ")";
        ctx.lineWidth = 1;

        // Calculate and project all 8 vertices
        const projectedVertices = CUBE_VERTICES.map((v) => {
          const rotated = rotate3D(v, cube.rotX, cube.rotY, cube.rotZ);
          return project3D(rotated, cube.x, cube.y, cube.scale);
        });

        // Draw cube edges
        CUBE_EDGES.forEach(([startIdx, endIdx]) => {
          const [sx, sy] = projectedVertices[startIdx];
          const [ex, ey] = projectedVertices[endIdx];

          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        });

        // Draw subtle glowing vertices
        projectedVertices.forEach(([vx, vy]) => {
          ctx.beginPath();
          ctx.arc(vx, vy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = COLORS[cube.color] + (opacity * 1.5) + ")";
          ctx.fill();
        });
      });
    };

    // Draw Concentric Orbits (Holographic HUD)
    const drawHUDOrbits = (w, h) => {
      const cores = [
        { cx: w * 0.12, cy: h * 0.45, color: "blue", rotDir: 1 },
        { cx: w * 0.88, cy: h * 0.45, color: "purple", rotDir: -1 }
      ];

      cores.forEach((core) => {
        const { cx, cy, color, rotDir } = core;
        const baseOpacity = 0.03;

        // Glowing center core gradient
        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 80);
        grad.addColorStop(0, COLORS[color] + "0.08)");
        grad.addColorStop(0.5, COLORS[color] + "0.02)");
        grad.addColorStop(1, COLORS[color] + "0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 80, 0, Math.PI * 2);
        ctx.fill();

        // Core Center Dot
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fillStyle = COLORS[color] + "0.3)";
        ctx.fill();

        // Orbit 1: Fast solid/dashed ring (R = 40)
        ctx.strokeStyle = COLORS[color] + (baseOpacity * 1.5) + ")";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 15]);
        ctx.beginPath();
        ctx.arc(cx, cy, 45, time * 0.01 * rotDir, time * 0.01 * rotDir + Math.PI * 2);
        ctx.stroke();

        // Orbit 2: Medium complex notched ring (R = 90)
        ctx.setLineDash([60, 40, 10, 40]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = COLORS[color] + (baseOpacity * 2) + ")";
        ctx.beginPath();
        ctx.arc(cx, cy, 90, -time * 0.005 * rotDir, -time * 0.005 * rotDir + Math.PI * 2);
        ctx.stroke();

        // Orbit 3: Outer light ring (R = 150)
        ctx.setLineDash([2, 8]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = COLORS[color] + baseOpacity + ")";
        ctx.beginPath();
        ctx.arc(cx, cy, 140, time * 0.002 * rotDir, time * 0.002 * rotDir + Math.PI * 2);
        ctx.stroke();

        // Clear line dash
        ctx.setLineDash([]);
      });
    };

    // Draw metaverse scrolling grid at bottom
    const drawGrid = (w, h) => {
      const gridY = h * 0.72; // grid horizon
      const gridH = h - gridY;
      const count = 25; // lines count
      const spacing = w / count;

      ctx.lineWidth = 0.5;
      
      // Vertical converging lines
      for (let i = 0; i <= count; i++) {
        const xPos = i * spacing;
        const progress = (xPos - w * 0.5) / (w * 0.5); // -1 to 1

        const alpha = Math.max(0, 0.08 - Math.abs(progress) * 0.05);
        ctx.strokeStyle = COLORS.teal + alpha + ")";
        
        ctx.beginPath();
        ctx.moveTo(xPos, h);
        // converge towards horizon center
        ctx.lineTo(w * 0.5 + progress * (w * 0.15), gridY);
        ctx.stroke();
      }

      // Horizontal lines (scrolling down)
      const lineCount = 8;
      const scrollOffset = (time * 0.4) % 30; // Grid speed

      for (let i = 0; i < lineCount; i++) {
        const rawY = i * (gridH / lineCount) + scrollOffset;
        if (rawY > gridH) continue;

        // Exponential distribution for realistic perspective
        const normY = rawY / gridH;
        const perspY = gridY + Math.pow(normY, 1.8) * gridH;
        const scale = Math.pow(normY, 1.8);
        const alpha = Math.max(0, scale * 0.08);

        ctx.strokeStyle = COLORS.teal + alpha + ")";
        
        ctx.beginPath();
        ctx.moveTo(w * 0.5 - (w * 0.5) * scale, perspY);
        ctx.lineTo(w * 0.5 + (w * 0.5) * scale, perspY);
        ctx.stroke();
      }
    };

    // Update & Draw Constellation particles
    const drawParticles = (w, h) => {
      const maxDistance = 110;

      // Update particle positions & physical limits
      particles.forEach((p) => {
        p.pulse += p.pulseSpeed;
        const scale = 0.8 + Math.sin(p.pulse) * 0.3;

        // Gravity pull from mouse
        if (mouse.active) {
          // Verify if mouse matches particle's screen side to feel natural
          const isSameSide = (p.side === "left" && mouse.x < w * 0.4) || 
                             (p.side === "right" && mouse.x > w * 0.6);

          if (isSameSide) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < mouse.radius) {
              const force = (mouse.radius - dist) / mouse.radius;
              // Gentle attraction force
              p.vx += (dx / dist) * force * 0.05;
              p.vy += (dy / dist) * force * 0.05;
              p.radius = (Math.random() * 2 + 1.5) * 1.4; // make node glow and swell slightly
            } else {
              p.radius = p.radius * 0.95 + (Math.sin(p.pulse) * 0.5 + 2) * 0.05; // recover normal size
            }
          }
        }

        // Apply velocities
        p.x += p.vx;
        p.y += p.vy;

        // Friction / Air drag to stabilize speed
        p.vx *= 0.96;
        p.vy *= 0.96;

        // Base idle movement force
        p.vx += (Math.random() - 0.5) * 0.04;
        p.vy += (Math.random() - 0.5) * 0.04;

        // Bounds Checking & side confinement (preserving center readability)
        if (p.side === "left") {
          // Confine to Left Zone (0 to 35% width)
          const rightLimit = w * 0.35;
          if (p.x < 15) { p.x = 15; p.vx *= -1; }
          if (p.x > rightLimit) {
            p.vx -= 0.05; // gentle push back left
            if (p.x > rightLimit + 30) p.x = rightLimit;
          }
        } else {
          // Confine to Right Zone (65% to 100% width)
          const leftLimit = w * 0.65;
          if (p.x > w - 15) { p.x = w - 15; p.vx *= -1; }
          if (p.x < leftLimit) {
            p.vx += 0.05; // gentle push back right
            if (p.x < leftLimit - 30) p.x = leftLimit;
          }
        }

        // Vertical boundaries
        if (p.y < 20) { p.y = 20; p.vy *= -1; }
        if (p.y > h - 40) { p.y = h - 40; p.vy *= -1; }

        // Draw particle dot
        const glow = Math.sin(p.pulse) * 0.15 + 0.35;
        const colorString = COLORS[p.color] + glow + ")";

        // Subtle gradient glow behind the node
        const nodeRadGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3.5);
        nodeRadGrad.addColorStop(0, COLORS[p.color] + "0.15)");
        nodeRadGrad.addColorStop(1, COLORS[p.color] + "0)");
        ctx.fillStyle = nodeRadGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Main solid node dot
        ctx.fillStyle = colorString;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * scale, 0, Math.PI * 2);
        ctx.fill();
      });

      // Connections & Lines (only within same side to avoid crossing the text)
      ctx.lineWidth = 0.5;
      particles.forEach(p => p.connections = []); // Clear current frame links

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];

          // Skip if particles are on different sides of the landing page
          if (p1.side !== p2.side) continue;

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.09;
            ctx.strokeStyle = COLORS[p1.color] + alpha + ")";
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Track connections for RAG data pulse spawner
            p1.connections.push({ target: p2, dist: dist });
            p2.connections.push({ target: p1, dist: dist });
          }
        }
      }

      // Constellation nodes interaction with mouse cursor
      if (mouse.active) {
        particles.forEach((p) => {
          // Must match current side
          const isSameSide = (p.side === "left" && mouse.x < w * 0.45) || 
                             (p.side === "right" && mouse.x > w * 0.55);

          if (isSameSide) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < mouse.radius) {
              const alpha = (1 - dist / mouse.radius) * 0.12;
              ctx.strokeStyle = COLORS[p.color] + alpha + ")";
              ctx.lineWidth = 0.7;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(mouse.x, mouse.y);
              ctx.stroke();
            }
          }
        });
      }
    };

    // Update and Draw RAG Energy Pulses traversing the lines
    const updateAndDrawPulses = () => {
      // Spawn random data pulses
      if (Math.random() < 0.05 && particles.length > 0) {
        // Find a particle with active connections
        const candidates = particles.filter(p => p.connections.length > 0);
        if (candidates.length > 0) {
          const startNode = candidates[Math.floor(Math.random() * candidates.length)];
          const link = startNode.connections[Math.floor(Math.random() * startNode.connections.length)];
          
          pulses.push({
            start: startNode,
            end: link.target,
            progress: 0,
            speed: (Math.random() * 0.015 + 0.015), // speed of data transmission
            color: startNode.color,
          });
        }
      }

      // Draw and update active pulses
      pulses = pulses.filter((p) => {
        p.progress += p.speed;

        if (p.progress >= 1) {
          // Completed path - pulse has reached target node!
          // Trigger a tiny flash on target node by swelling its pulse slightly
          p.end.pulse += Math.PI * 0.5; // shift phase for instant swelling
          p.end.vx += (Math.random() - 0.5) * 0.5; // kick node slightly
          return false; // delete pulse
        }

        // Interpolate coordinate along the line
        const px = p.start.x + (p.end.x - p.start.x) * p.progress;
        const py = p.start.y + (p.end.y - p.start.y) * p.progress;

        // Draw glow path node pulse
        const radGrad = ctx.createRadialGradient(px, py, 0, px, py, 5);
        radGrad.addColorStop(0, COLORS[p.color] + "1)");
        radGrad.addColorStop(0.5, COLORS[p.color] + "0.4)");
        radGrad.addColorStop(1, COLORS[p.color] + "0)");
        
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();

        // Core bright pixel
        ctx.fillStyle = COLORS.white + "0.95)";
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fill();

        return true;
      });
    };

    // Spawn shockwave ripple (User clicks screen)
    const triggerRipple = (cx, cy) => {
      ripples.push({
        x: cx,
        y: cy,
        radius: 0,
        maxRadius: 260,
        speed: 5.5,
        alpha: 1.0,
      });

      // Kickoff 5 instant pulses around the click if they are in the zone
      const nearestParticles = particles
        .map(p => {
          const dx = p.x - cx;
          const dy = p.y - cy;
          return { p, dist: Math.sqrt(dx * dx + dy * dy) };
        })
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 8);

      nearestParticles.forEach(({ p }) => {
        if (p.connections.length > 0) {
          const link = p.connections[Math.floor(Math.random() * p.connections.length)];
          pulses.push({
            start: p,
            end: link.target,
            progress: 0,
            speed: 0.04, // high speed burst
            color: "teal",
          });
        }
      });
    };

    // Draw expanding click ripple effects
    const drawRipples = () => {
      ripples = ripples.filter((r) => {
        r.radius += r.speed;
        r.alpha = 1 - r.radius / r.maxRadius;

        if (r.radius >= r.maxRadius) return false;

        // Physical repulsion force on particles caught in ripple wave
        particles.forEach((p) => {
          const dx = p.x - r.x;
          const dy = p.y - r.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // If particle matches shockwave front line
          const shockTolerance = 12;
          if (Math.abs(dist - r.radius) < shockTolerance) {
            const angle = Math.atan2(dy, dx);
            const force = (1 - dist / r.maxRadius) * 2.5; // force fades outward
            
            p.vx += Math.cos(angle) * force;
            p.vy += Math.sin(angle) * force;
            p.pulse += 0.2; // pulse excitation
          }
        });

        // Draw ripple ring
        ctx.strokeStyle = COLORS.teal + (r.alpha * 0.18) + ")";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Outer glow ripple
        ctx.strokeStyle = COLORS.blue + (r.alpha * 0.07) + ")";
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(0, r.radius - 8), 0, Math.PI * 2);
        ctx.stroke();

        return true;
      });
    };

    // Handle high density display / canvas sizing
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      
      ctx.scale(dpr, dpr);

      // Re-initialize elements relative to new scale
      particles = initParticles(rect.width, rect.height);
      cubes = initCubes(rect.width, rect.height);
      pulses = [];
      ripples = [];
    };

    // Event listeners
    const handleMouseMove = (e) => {
      const rect = parent.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const handleClick = (e) => {
      const rect = parent.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      triggerRipple(clickX, clickY);
    };

    // Bind listeners to parent container (.hero section)
    parent.addEventListener("mousemove", handleMouseMove);
    parent.addEventListener("mouseleave", handleMouseLeave);
    parent.addEventListener("click", handleClick);

    // Initial resize setup
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Main animation loop
    const render = () => {
      time++;
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      // Draw layers
      drawGrid(w, h);
      drawCubes(w, h);
      drawHUDOrbits(w, h);
      drawParticles(w, h);
      updateAndDrawPulses();
      drawRipples();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      parent.removeEventListener("mousemove", handleMouseMove);
      parent.removeEventListener("mouseleave", handleMouseLeave);
      parent.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={styles.visualContainer}>
      <canvas ref={canvasRef} className={styles.visualCanvas} />
    </div>
  );
}
