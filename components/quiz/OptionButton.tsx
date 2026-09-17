"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { Circle, Diamond, Square, Triangle } from "lucide-react";
import type { OptionColor } from "@/lib/types";

const COLOR_CLASSES: Record<OptionColor, string> = {
  red: "bg-option-red border-option-red-border",
  blue: "bg-option-blue border-option-blue-border",
  yellow: "bg-option-yellow border-option-yellow-border",
  green: "bg-option-green border-option-green-border",
};

const SHAPE_ICON: Record<OptionColor, typeof Triangle> = {
  red: Triangle,
  blue: Diamond,
  yellow: Circle,
  green: Square,
};

interface OptionButtonProps {
  color: OptionColor;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  dimmed?: boolean;
  size?: "sm" | "lg";
  iconSize?: number;
}

export function OptionButton({
  color,
  label,
  onClick,
  disabled,
  dimmed,
  size = "lg",
  iconSize,
}: OptionButtonProps) {
  const Icon = SHAPE_ICON[color];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.96, translateY: 2 }}
      className={clsx(
        "flex items-center gap-3 rounded-2xl border-b-4 text-white font-semibold text-left transition-opacity",
        COLOR_CLASSES[color],
        size === "lg" ? "px-5 py-4 text-base" : "px-4 py-3 text-sm",
        dimmed && "opacity-40",
        disabled && "pointer-events-none"
      )}
    >
      <Icon size={iconSize ?? (size === "lg" ? 22 : 18)} fill="white" strokeWidth={0} />
      <span>{label}</span>
    </motion.button>
  );
}
