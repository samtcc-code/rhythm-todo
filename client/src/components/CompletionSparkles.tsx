import { useEffect, useState, type CSSProperties } from "react";

// Yellow + orange 4-point stars burst from the check circle when a task
// is completed. Matches the favicon aesthetic. Self-unmounts after the
// animation ends so we don't leave DOM behind.

interface Star {
  x: number;   // final translate X (px)
  y: number;   // final translate Y (px)
  size: number;
  delay: number; // ms
  color: string;
}

const STARS: Star[] = [
  { x: -40, y: -55, size: 14, delay: 0,   color: "#FFC531" },
  { x:  48, y: -60, size: 16, delay: 40,  color: "#FF6712" },
  { x:  62, y:  14, size: 13, delay: 80,  color: "#FFC531" },
  { x:  32, y:  56, size: 15, delay: 120, color: "#FF6712" },
  { x: -50, y:  46, size: 14, delay: 60,  color: "#FFC531" },
  { x: -60, y: -10, size: 12, delay: 100, color: "#FF6712" },
  { x:   6, y: -68, size: 11, delay: 140, color: "#FFC531" },
  { x: -10, y:  70, size: 12, delay: 20,  color: "#FF6712" },
];

const DURATION_MS = 900;

export default function CompletionSparkles() {
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setAlive(false), DURATION_MS + 200);
    return () => clearTimeout(t);
  }, []);

  if (!alive) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-20"
      style={{ transform: "translate(-50%, -50%)" }}
    >
      {STARS.map((s, i) => (
        <svg
          key={i}
          className="sparkle-star absolute"
          width={s.size}
          height={s.size}
          viewBox="0 0 24 24"
          fill={s.color}
          style={{
            left: 0,
            top: 0,
            marginLeft: -s.size / 2,
            marginTop: -s.size / 2,
            animationDelay: `${s.delay}ms`,
            ["--tx" as string]: `${s.x}px`,
            ["--ty" as string]: `${s.y}px`,
          } as CSSProperties}
        >
          <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
        </svg>
      ))}
    </div>
  );
}
