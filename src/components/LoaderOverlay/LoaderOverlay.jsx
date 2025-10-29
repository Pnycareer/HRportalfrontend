// components/LoaderOverlay.jsx
import React from "react";

const loaderOverlayStyles = `
@keyframes loaderOverlaySweep {
  0% {
    transform: translateX(-100%);
  }
  55% {
    transform: translateX(-8%);
  }
  100% {
    transform: translateX(100%);
  }
}
`;

export default function LoaderOverlay({ show }) {
  if (!show) return null;

  return (
    <>
      <style>{loaderOverlayStyles}</style>
      <div
        className="fixed inset-0 z-[70] grid place-items-center bg-background/60 backdrop-blur-sm"
        aria-live="assertive"
        aria-busy="true"
      >
        <div className="flex w-64 max-w-[80vw] flex-col items-center gap-5">
          <div className="flex w-full flex-col items-center gap-3">
            <div
              className="relative h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
              role="progressbar"
              aria-label="Loading"
            >
              <div
                className="absolute inset-y-0 left-0 h-full w-1/2 rounded-full bg-gradient-to-r from-primary/30 via-sky-400 to-primary/40"
                style={{ animation: "loaderOverlaySweep 1.1s ease-in-out infinite" }}
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground/90">
              Loading
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
