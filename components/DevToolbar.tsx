"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Grip, LayoutDashboard, Minus, Smartphone, Tv } from "lucide-react";
import { useQuizGame } from "@/context/QuizGameContext";

/**
 * Dev-only route switcher. Ships disabled in production builds (see the
 * NODE_ENV guard below) -- it exists purely so you can jump between the
 * three roles while building, without it ever reaching real users.
 */
export function DevToolbar() {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const { hostSessionId } = useQuizGame();

  if (process.env.NODE_ENV === "production") return null;

  const links = [
    { prefix: "/admin", href: "/admin", label: "Admin builder", icon: LayoutDashboard },
    { prefix: "/join", href: "/join", label: "Participant", icon: Smartphone },
    { prefix: "/host", href: hostSessionId ? `/host/${hostSessionId}` : "/admin", label: "Host stage", icon: Tv },
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-ink text-white rounded-full w-11 h-11 flex items-center justify-center shadow-lg"
        aria-label="Open dev view switcher"
      >
        <Grip size={18} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-ink text-white rounded-2xl shadow-lg px-2 py-2 flex items-center gap-1 flex-wrap max-w-[92vw]">
      <span className="text-[11px] font-semibold text-white/60 px-2">DEMO</span>
      {links.map(({ prefix, href, label, icon: Icon }) => {
        const active = pathname?.startsWith(prefix);
        return (
          <Link
            key={label}
            href={href}
            className={clsx(
              "flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl",
              active ? "bg-brand text-white" : "text-white/80 hover:bg-white/10"
            )}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
      <button
        onClick={() => setOpen(false)}
        aria-label="Minimize dev view switcher"
        className="ml-1 p-2 rounded-xl hover:bg-white/10"
      >
        <Minus size={14} />
      </button>
    </div>
  );
}
