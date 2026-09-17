"use client";

interface CountdownRingProps {
  secondsLeft: number;
  fraction: number;
  size?: number;
  trackClassName?: string;
  progressClassName?: string;
  numberClassName?: string;
}

export function CountdownRing({
  secondsLeft,
  fraction,
  size = 92,
  trackClassName = "stroke-brand-tint",
  progressClassName = "stroke-brand",
  numberClassName = "text-brand-deep",
}: CountdownRingProps) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);

  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={8} className={trackClassName} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={progressClassName}
          style={{ transition: "stroke-dashoffset 0.2s linear" }}
        />
      </svg>
      <div
        className={`absolute inset-0 flex items-center justify-center font-display font-semibold ${numberClassName}`}
        style={{ fontSize: size * 0.3 }}
      >
        {secondsLeft}
      </div>
    </div>
  );
}
