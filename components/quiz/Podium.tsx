"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Participant } from "@/lib/types";

const CONFETTI_COLORS = ["#EF4444", "#3B82F6", "#F59E0B", "#10B981", "#ffffff"];

function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;
    canvas.width = width;
    canvas.height = height;

    const particles = Array.from({ length: 90 }, (_, i) => ({
      x: Math.random() * width,
      y: -20 - Math.random() * 140,
      vy: 2 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 2.5,
      size: 4 + Math.random() * 4,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotation: Math.random() * 360,
    }));

    let frame = 0;
    let raf = 0;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.y += p.vy;
        p.x += p.vx;
        p.rotation += 6;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      frame += 1;
      if (frame < 150) {
        raf = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

interface PodiumProps {
  participants: Participant[];
}

export function Podium({ participants }: PodiumProps) {
  const ranked = [...participants].sort((a, b) => b.score - a.score);
  const [first, second, third] = ranked;

  const columns = [
    { participant: second, place: 2, height: 92, delay: 0.1 },
    { participant: first, place: 1, height: 132, delay: 0 },
    { participant: third, place: 3, height: 68, delay: 0.2 },
  ];

  return (
    <div className="relative">
      <ConfettiBurst />
      <div className="relative z-10 flex items-end justify-center gap-4 pt-4">
        {columns.map(({ participant, place, height, delay }) =>
          participant ? (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay, duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center gap-2 text-white"
            >
              <span className="text-2xl" aria-hidden="true">
                {participant.avatar}
              </span>
              <div
                className={
                  place === 1
                    ? "w-20 rounded-t-xl bg-white text-brand-deep flex items-start justify-center pt-2 font-display font-semibold text-2xl"
                    : "w-20 rounded-t-xl bg-white/25 border border-white/40 flex items-start justify-center pt-2 font-display font-semibold text-2xl"
                }
                style={{ height }}
              >
                {place}
              </div>
              <span className="text-xs font-semibold text-center max-w-[6rem] truncate">{participant.name}</span>
              <span className="text-[11px] text-white/85 tabular-nums">
                {participant.score.toLocaleString()} pts
              </span>
            </motion.div>
          ) : null
        )}
      </div>
    </div>
  );
}
