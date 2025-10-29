import React from "react";

export default function Spinner({ label = "Loading..." }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-screen w-full flex-col items-center justify-center gap-6 text-primary"
    >
      <div className="relative h-20 w-20" aria-hidden="true">
        <div className="absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.35),_transparent_70%)] blur-xl motion-reduce:animate-none" />
        <div
          className="absolute inset-0 animate-[spin_1.4s_cubic-bezier(0.55,0.1,0.45,0.9)_infinite] rounded-full motion-reduce:animate-none"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(59,130,246,0.12) 0deg, rgba(59,130,246,0.75) 150deg, rgba(56,189,248,0.28) 240deg, rgba(59,130,246,0.12) 360deg)",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 1px))",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 1px))",
          }}
        />
        <div
          className="absolute inset-1 animate-[spin_1.9s_linear_infinite] rounded-full opacity-80 motion-reduce:animate-none"
          style={{
            animationDirection: "reverse",
            background:
              "conic-gradient(from 180deg, rgba(59,130,246,0) 0deg, rgba(129,140,248,0.85) 120deg, rgba(56,189,248,0.35) 220deg, rgba(59,130,246,0) 360deg)",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 7px), black calc(100% - 2px))",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 7px), black calc(100% - 2px))",
          }}
        />
        <div className="absolute inset-[10px] rounded-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.4),_rgba(59,130,246,0.18)_55%,_rgba(15,23,42,0.7)_100%)] backdrop-blur-[2px]" />
        <div className="absolute inset-[17px] animate-[pulse_4s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.5),_rgba(56,189,248,0.18)_55%,_rgba(15,23,42,0.75)_100%)] shadow-[0_0_25px_rgba(59,130,246,0.45)] motion-reduce:animate-none" />
        <div className="absolute inset-[22px] rounded-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_transparent_65%)] opacity-60" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}
