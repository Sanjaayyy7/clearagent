import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WORDS = ["Verify.", "Audit.", "Comply."];
const DURATION = 2700;

interface Props { onComplete: () => void; }

export default function LoadingScreen({ onComplete }: Props) {
  const [wordIdx, setWordIdx] = useState(0);
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);

  /* Cycle words every 900ms */
  useEffect(() => {
    const id = setInterval(() => setWordIdx((i) => (i + 1) % WORDS.length), 900);
    return () => clearInterval(id);
  }, []);

  /* Counter 000 → 100 over DURATION ms, then call onComplete */
  useEffect(() => {
    let start: number | null = null;
    let raf: number;

    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / DURATION, 1);
      setCount(Math.round(progress * 100));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else if (!doneRef.current) {
        doneRef.current = true;
        setTimeout(onComplete, 400);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.7, ease: [0.23, 1, 0.32, 1] } }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      {/* Top-left label */}
      <motion.span
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
        style={{
          position: "absolute",
          top: 28,
          left: 32,
          fontFamily: "var(--font-body)",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        ClearAgent
      </motion.span>

      {/* Center: cycling word */}
      <div style={{ height: "clamp(64px,10vw,96px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={wordIdx}
            className="loading-word"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.85, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          >
            {WORDS[wordIdx]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Bottom-right: counter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{ position: "absolute", bottom: 32, right: 40, lineHeight: 1 }}
      >
        <span className="loading-counter">{String(count).padStart(3, "0")}</span>
      </motion.div>

      {/* Bottom: progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "var(--border)",
        }}
      >
        <div className="progress-bar-fill" />
      </div>
    </motion.div>
  );
}
