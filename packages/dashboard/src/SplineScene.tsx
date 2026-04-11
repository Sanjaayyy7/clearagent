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
      document
        .querySelectorAll<HTMLElement>(".spline-watermark, [class*='watermark'], a[href*='spline.design']")
        .forEach((node) => {
          node.style.display = "none";
          node.style.pointerEvents = "none";
        });

      const canvas = wrapper.querySelector("canvas");
      if (!canvas) return;

      let sibling = canvas.nextElementSibling as HTMLElement | null;
      while (sibling) {
        sibling.style.display = "none";
        sibling.style.pointerEvents = "none";
        sibling = sibling.nextElementSibling as HTMLElement | null;
      }
    };

    const timeouts = [300, 1000, 2500].map((delay) => window.setTimeout(hideOverlay, delay));
    const observer = new MutationObserver(hideOverlay);
    observer.observe(wrapper, { childList: true, subtree: true });

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
      observer.disconnect();
    };
  }, [scene]);

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#ffffff" }}
    >
      <Spline scene={scene} className={className} style={{ width: "100%", height: "100%", display: "block", ...style }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none" }} />
    </div>
  );
}
