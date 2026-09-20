"use client";

import { useEffect, useRef } from "react";
import { stepParticle, type Particle } from "@/lib/memory-particles";
import s from "./memories.module.css";

type Dot = Particle & { size: number; alpha: number; color: string };
const palette = ["#d9aa29", "#efc63d", "#ffe052", "#ffed88", "#fff5c2", "#ffffff"];
const seed = (i: number) => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

export default function MemoryAtmosphere() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current, section = element?.closest("main");
    const ctx = element?.getContext("2d", { alpha: true });
    if (!element || !section || !ctx) return;
    const surface = element, host = section, context = ctx;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1, height = 1, frame = 0, previous = 0, visible = true, lastMove = 0;
    let dots: Dot[] = [];
    const pointer = { x: 0, y: 0, vx: 0, vy: 0, active: false };
    const canAnimate = () => !reduced.matches && visible && !document.hidden;
    function draw(dt = 0) {
      context.clearRect(0, 0, width, height);
      for (const dot of dots) {
        if (!reduced.matches) stepParticle(dot, pointer, dt, width, height);
        const proximity = pointer.active && !reduced.matches ? Math.max(0, 1 - Math.hypot(dot.x - pointer.x, dot.y - pointer.y) / 125) : 0;
        const edge = Math.max(0, Math.min(1, (dot.x + 8) / 24, (width + 8 - dot.x) / 24, (dot.y + 8) / 24, (height + 8 - dot.y) / 24));
        const fade = reduced.matches ? 1 : dot.fade * dot.fade * (3 - 2 * dot.fade);
        context.globalAlpha = Math.min(0.95, dot.alpha + proximity * 0.15) * fade * edge;
        context.fillStyle = dot.color;
        context.shadowColor = dot.color;
        context.shadowBlur = 7;
        context.beginPath();
        context.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
      const decay = Math.exp(-8 * dt);
      pointer.vx *= decay; pointer.vy *= decay;
    }
    function tick(now: number) {
      frame = 0;
      if (!canAnimate()) return;
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now; draw(dt); frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame); frame = 0; previous = 0;
      if (reduced.matches) pointer.active = false;
      draw();
      if (canAnimate()) frame = requestAnimationFrame(tick);
    }
    function resize() {
      const bounds = surface.getBoundingClientRect();
      const oldWidth = width, oldHeight = height;
      width = Math.max(1, bounds.width); height = Math.max(1, bounds.height);
      const scale = Math.min(devicePixelRatio || 1, 2);
      surface.width = Math.round(width * scale); surface.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      const count = Math.round(Math.min(440, Math.max(100, width * height / 3400)));
      const columns = Math.ceil(Math.sqrt(count * width / height)), rows = Math.ceil(count / columns);
      dots = Array.from({ length: count }, (_, i) => {
        const old = dots[i];
        const driftX = 2 + seed(i + 50) * 5, driftY = (seed(i + 70) - 0.5) * 5;
        return {
          x: old ? old.x / oldWidth * width : ((i % columns) + seed(i + 1)) / columns * width,
          y: old ? old.y / oldHeight * height : (Math.floor(i / columns) + seed(i + 100)) / rows * height,
          vx: old?.vx ?? driftX, vy: old?.vy ?? driftY, driftX, driftY,
          spawnX: ((i % columns) + 0.15 + seed(i + 1) * 0.7) / columns,
          spawnY: (Math.floor(i / columns) + 0.15 + seed(i + 100) * 0.7) / rows,
          fade: old?.fade ?? 1,
          phase: seed(i + 90) * Math.PI * 2, size: 0.7 + seed(i + 200) * 1.3,
          alpha: 0.4 + seed(i + 300) * 0.35, color: palette[Math.floor(seed(i + 400) * palette.length)],
        };
      });
      sync();
    }
    function move(event: PointerEvent) {
      if (event.pointerType === "touch" || reduced.matches) return;
      const bounds = surface.getBoundingClientRect(), sectionBounds = host.getBoundingClientRect();
      const x = event.clientX - bounds.left, y = event.clientY - bounds.top, now = performance.now();
      const dt = Math.max(0.016, (now - lastMove) / 1000);
      pointer.vx = pointer.active ? (x - pointer.x) / dt : 0;
      pointer.vy = pointer.active ? (y - pointer.y) / dt : 0;
      pointer.x = x; pointer.y = y; lastMove = now;
      pointer.active = y >= 0 && y <= height && x >= 0 && x <= width && event.clientY >= sectionBounds.top && event.clientY <= sectionBounds.bottom;
    }
    const leave = () => { pointer.active = false; pointer.vx = 0; pointer.vy = 0; };
    const observer = new ResizeObserver(resize); observer.observe(surface);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }); intersection.observe(host);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", leave, { passive: true });
    window.addEventListener("blur", leave);
    document.documentElement.addEventListener("pointerleave", leave);
    reduced.addEventListener("change", sync); document.addEventListener("visibilitychange", sync);
    resize();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      window.removeEventListener("pointermove", move); window.removeEventListener("scroll", leave); window.removeEventListener("blur", leave);
      document.documentElement.removeEventListener("pointerleave", leave);
      reduced.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return <div className={s.atmosphere} aria-hidden="true"><canvas ref={canvas} className={s.particleCanvas} /></div>;
}
