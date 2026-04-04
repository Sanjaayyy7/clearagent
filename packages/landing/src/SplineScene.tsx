import Spline from "@splinetool/react-spline";
import { useEffect, useRef } from "react";

interface SplineSceneProps {
  scene: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SplineScene({ scene, className, style }: SplineSceneProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const hideOverlay = () => {
      const canvas = wrapper.querySelector("canvas");
      if (!canvas) return;
      // Hide every DOM sibling Spline injects next to the canvas
      let sib = canvas.nextElementSibling as HTMLElement | null;
      while (sib) {
        sib.style.display = "none";
        sib.style.pointerEvents = "none";
        sib = sib.nextElementSibling as HTMLElement | null;
      }
    };

    // Run after short delays to catch Spline's async DOM insertions
    const t1 = setTimeout(hideOverlay, 300);
    const t2 = setTimeout(hideOverlay, 1000);
    const t3 = setTimeout(hideOverlay, 2500);

    // Also watch for any late-inserted elements
    const observer = new MutationObserver(hideOverlay);
    observer.observe(wrapper, { childList: true, subtree: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      observer.disconnect();
    };
  }, [scene]);

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <Spline
        scene={scene}
        className={className}
        style={{ width: "100%", height: "100%", display: "block", ...style }}
      />
      <div style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }} />
    </div>
  );
}
