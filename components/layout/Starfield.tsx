"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  layer: number;
  twinkle: number;
}

export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const stars: Star[] = Array.from({ length: 180 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.4 + 0.3,
      layer: Math.floor(Math.random() * 3) + 1,
      twinkle: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    let t = 0;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      t += 0.003;
      for (const s of stars) {
        const drift = (t * s.layer * 2) % width;
        const x = (s.x + drift) % width;
        const alpha = 0.35 + 0.35 * Math.sin(s.twinkle + t * s.layer);
        ctx.beginPath();
        ctx.fillStyle = `rgba(231, 233, 238, ${Math.max(0.15, alpha)})`;
        ctx.arc(x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();

    function onResize() {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none hidden dark:block"
      aria-hidden="true"
    />
  );
}
