"use client";

import { motion } from "framer-motion";

interface ParticipantTagProps {
  name: string;
  avatar: string;
}

export function ParticipantTag({ name, avatar }: ParticipantTagProps) {
  return (
    <motion.span
      initial={{ scale: 0.4, y: 10, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
      className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/30 text-white text-sm font-semibold px-3 py-1.5"
    >
      <span aria-hidden="true">{avatar}</span>
      <span>{name}</span>
    </motion.span>
  );
}
