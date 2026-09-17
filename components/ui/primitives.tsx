"use client";

import clsx from "clsx";
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

type ButtonVariant = "primary" | "white" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * The tactile, "3D bottom border" button used everywhere a player or host
 * takes a game action (Start game, Next question, Join townhall...).
 */
export function TactileButton({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        "rounded-2xl font-display font-semibold px-7 py-3 border-b-4 transition-transform active:translate-y-0.5 active:border-b-2 disabled:opacity-50 disabled:pointer-events-none",
        variant === "primary" && "bg-brand text-white border-brand-dark",
        variant === "white" && "bg-white text-brand-deep border-brand-tint",
        variant === "ghost" && "bg-transparent text-ink border-transparent hover:bg-brand-tint/60",
        className
      )}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={clsx("bg-white border border-brand-tint rounded-card shadow-sm", className)}
    />
  );
}

type BadgeTone = "live" | "draft" | "archived" | "brand";

export function Badge({ tone = "brand", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      {...props}
      className={clsx(
        "inline-flex items-center rounded-full text-xs font-semibold px-3 py-1",
        tone === "live" && "bg-brand-tint text-brand-deep",
        tone === "draft" && "bg-amber-100 text-amber-800",
        tone === "archived" && "bg-slate-100 text-ink-soft",
        tone === "brand" && "bg-brand text-white",
        className
      )}
    />
  );
}
