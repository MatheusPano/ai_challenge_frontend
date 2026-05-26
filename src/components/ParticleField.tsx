"use client";

import { useEffect, useRef } from "react";

type ParticleFieldProps = {
  /** Radius (px) of the visible mesh. */
  radius?: number;
  /** Grid cell size (px) — smaller = denser mesh. */
  cell?: number;
  /** Extra Tailwind classes on the wrapper. */
  className?: string;
};

type Node = {
  /** Base grid position (relative to center, in px). */
  gx: number;
  gy: number;
  /** Per-node phase so the breathing isn't synchronized. */
  phase: number;
  /** Pill length / width (px). */
  len: number;
  width: number;
  /** Live screen-space position with inertia. */
  px: number;
  py: number;
  /** Inertia coefficient (per-particle). */
  mass: number;
  /** HSL color from curated palette. */
  hue: number;
  sat: number;
  light: number;
  alpha: number;
};

/**
 * Antigravity-style breathing mesh, centered behind the content. The
 * field doesn't follow the cursor — it sits centered on the viewport,
 * slowly rotates, breathes, and morphs shape.
 */
export function ParticleField({
  radius = 620,
  cell = 60,
  className,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let nodes: Node[] = [];
    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Field center — locked to viewport center.
    const center = { x: 0, y: 0 };

    const palette = [
      { h: 14, s: 90, l: 52 },
      { h: 28, s: 95, l: 55 },
      { h: 42, s: 95, l: 56 },
      { h: 350, s: 80, l: 56 },
      { h: 202, s: 100, l: 50 }, // #00a3ff
      { h: 202, s: 100, l: 50 },
      { h: 202, s: 100, l: 50 },
    ];

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      if (width <= 0 || height <= 0) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      center.x = width / 2;
      center.y = height / 2;
    }

    // Morphing blob boundary: each harmonic has its own slow drift.
    const lobes = [
      { k: 2, amp: 0.22, phase: Math.random() * Math.PI * 2, drift: 0.18 },
      { k: 3, amp: 0.14, phase: Math.random() * Math.PI * 2, drift: -0.27 },
      { k: 5, amp: 0.08, phase: Math.random() * Math.PI * 2, drift: 0.41 },
    ];
    function boundaryAt(angle: number, tSec = 0): number {
      let r = 1;
      for (const l of lobes) r += l.amp * Math.sin(l.k * angle + l.phase + tSec * l.drift);
      return radius * r;
    }

    function seed() {
      nodes = [];
      const half = Math.ceil((radius * 1.5) / cell);
      for (let i = -half; i <= half; i++) {
        for (let j = -half; j <= half; j++) {
          const sx = (j % 2 === 0 ? 0 : cell / 2);
          const jx = (Math.random() - 0.5) * cell * 0.35;
          const jy = (Math.random() - 0.5) * cell * 0.35;
          const gx = i * cell + sx + jx;
          const gy = j * cell + jy;
          const d = Math.hypot(gx, gy);
          const ang = Math.atan2(gy, gx);
          if (d > boundaryAt(ang)) continue;
          const t = (ang + Math.PI) / (Math.PI * 2);
          const idx = Math.min(palette.length - 1, Math.floor(t * palette.length));
          const c = palette[idx];
          nodes.push({
            gx,
            gy,
            px: center.x + gx,
            py: center.y + gy,
            mass: 0.3 + Math.random() * 0.7,
            phase: Math.random() * Math.PI * 2,
            len: 7 + Math.random() * 5,
            width: 2 + Math.random() * 1.2,
            hue: c.h + (Math.random() - 0.5) * 10,
            sat: c.s,
            light: c.l + (Math.random() - 0.5) * 6,
            alpha: 0.6 + Math.random() * 0.35,
          });
        }
      }
    }

    function step(now: number) {
      ctx!.clearRect(0, 0, width, height);
      ctx!.lineCap = "round";

      const tSec = now / 1000;
      const breath = 1 + Math.sin(tSec * 1.1) * 0.06;
      const spin = tSec * 0.18;
      const cosS = Math.cos(spin);
      const sinS = Math.sin(spin);

      for (const n of nodes) {
        const d = Math.hypot(n.gx, n.gy);
        const wave = Math.sin(tSec * 1.6 - d * 0.012 + n.phase) * 0.08;
        const scale = breath + wave;

        const rx = n.gx * cosS - n.gy * sinS;
        const ry = n.gx * sinS + n.gy * cosS;

        const targetX = center.x + rx * scale;
        const targetY = center.y + ry * scale;

        const k = 0.04 + 0.12 * n.mass;
        n.px += (targetX - n.px) * k;
        n.py += (targetY - n.py) * k;

        const x = n.px;
        const y = n.py;

        const ang = Math.atan2(y - center.y, x - center.x);
        const tx = Math.cos(ang);
        const ty = Math.sin(ang);
        const half = n.len / 2;

        const r = d / boundaryAt(Math.atan2(ry, rx), tSec);
        let alpha = n.alpha;
        if (r > 0.78) alpha *= Math.max(0, 1 - (r - 0.78) / 0.28);
        if (r < 0.12) alpha *= r / 0.12;

        ctx!.strokeStyle = `hsla(${n.hue.toFixed(0)}, ${n.sat.toFixed(0)}%, ${n.light.toFixed(0)}%, ${alpha.toFixed(3)})`;
        ctx!.lineWidth = n.width;
        ctx!.beginPath();
        ctx!.moveTo(x - tx * half, y - ty * half);
        ctx!.lineTo(x + tx * half, y + ty * half);
        ctx!.stroke();
      }
    }

    function loop(now: number) {
      step(now);
      raf = requestAnimationFrame(loop);
    }

    resize();
    seed();
    requestAnimationFrame(resize);
    window.addEventListener("resize", resize);

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [radius, cell]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 overflow-hidden ${className ?? ""}`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
