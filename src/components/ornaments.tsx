import { cn } from "@/lib/utils";

const INK = "var(--color-ink)";
const BG = "var(--color-bg)";

function petalPath(r: number, w: number) {
  return `M0 0 C ${w} ${-r * 0.3}, ${w * 1.15} ${-r * 0.82}, 0 ${-r} C ${-w * 1.15} ${-r * 0.82}, ${-w} ${-r * 0.3}, 0 0 Z`;
}

/** Layered rose seen from above. `tone="light"`: white petals; `tone="dark"`: black petals with white lines. */
export function Rose({
  size = 64,
  tone = "dark",
  className,
  style,
  x,
  y,
}: {
  size?: number;
  tone?: "light" | "dark";
  className?: string;
  style?: React.CSSProperties;
  /** Position when nested inside another SVG (top-left corner). */
  x?: number;
  y?: number;
}) {
  const fill = tone === "light" ? INK : BG;
  const stroke = tone === "light" ? BG : INK;
  const layers = [
    { r: 46, n: 7, rot: 0 },
    { r: 36, n: 6, rot: 22 },
    { r: 26, n: 5, rot: 8 },
    { r: 17, n: 4, rot: 40 },
  ];
  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      x={x}
      y={y}
      className={className}
      style={style}
      aria-hidden="true"
    >
      {layers.map((l, li) => (
        <g key={li} transform={`rotate(${l.rot})`}>
          {Array.from({ length: l.n }, (_, i) => (
            <path
              key={i}
              d={petalPath(l.r, l.r * 0.5)}
              transform={`rotate(${(360 / l.n) * i})`}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          ))}
        </g>
      ))}
      <path
        d="M0 0 m-1 -1 c3 -3 7 0 6 4 c-1 5 -8 7 -12 3 c-5 -5 -1 -13 6 -14 c9 -1 15 7 13 15"
        fill="none"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Small leaf pair to tuck under roses. */
export function Leaves({ size = 60, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 50" width={size} height={size / 2} className={className} aria-hidden="true">
      <path d="M50 25 C 35 5, 10 8, 2 22 C 15 30, 38 32, 50 25 Z" fill={BG} stroke={INK} strokeWidth={1.4} />
      <path d="M50 25 C 65 5, 90 8, 98 22 C 85 30, 62 32, 50 25 Z" fill={BG} stroke={INK} strokeWidth={1.4} />
      <path d="M6 22 C 20 20, 36 22, 50 25 M94 22 C 80 20, 64 22, 50 25" fill="none" stroke={INK} strokeWidth={1} />
    </svg>
  );
}

/** Guadalupe-style aureole: alternating straight and flame-shaped rays. */
export function HaloRays({
  size = 520,
  rays = 56,
  className,
}: {
  size?: number;
  rays?: number;
  className?: string;
}) {
  const inner = 120;
  return (
    <svg viewBox="-250 -250 500 500" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <radialGradient id="halo-fade" r="0.5">
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="halo-mask">
          <rect x="-250" y="-250" width="500" height="500" fill="url(#halo-fade)" />
        </mask>
      </defs>
      <g mask="url(#halo-mask)">
        {Array.from({ length: rays }, (_, i) => {
          const angle = (360 / rays) * i;
          const wavy = i % 2 === 1;
          const len = wavy ? 215 : 240;
          const d = wavy
            ? `M0 ${-inner} C 6 ${-inner - 30}, -6 ${-inner - 60}, 0 ${-inner - 90} C 6 ${-inner - 120}, -4 ${-len + 30}, 0 ${-len}`
            : `M-3 ${-inner} L 0 ${-len} L 3 ${-inner} Z`;
          return (
            <path
              key={i}
              d={d}
              transform={`rotate(${angle})`}
              fill={wavy ? "none" : INK}
              stroke={INK}
              strokeWidth={wavy ? 1.2 : 0.5}
              opacity={wavy ? 0.55 : 0.85}
            />
          );
        })}
      </g>
    </svg>
  );
}

function Star({ x, y, s = 3 }: { x: number; y: number; s?: number }) {
  return (
    <path
      d={`M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z`}
      fill={INK}
    />
  );
}

/** Black & white Virgin emblem: mantle with stars, praying hands, crescent and roses at her feet. */
export function VirginEmblem({ size = 280, className, animated = true }: { size?: number; className?: string; animated?: boolean }) {
  const stars: [number, number][] = [
    [72, 110], [64, 140], [58, 172], [52, 204], [80, 160], [74, 192],
    [128, 110], [136, 140], [142, 172], [148, 204], [120, 160], [126, 192],
  ];
  return (
    <svg viewBox="0 0 200 270" width={size} height={(size * 270) / 200} className={className} role="img" aria-label="Virgen con rosas">
      <ellipse
        cx="100"
        cy="132"
        rx="70"
        ry="116"
        fill="none"
        stroke={INK}
        strokeWidth="1"
        strokeDasharray="2 5"
        opacity="0.6"
        className={animated ? "animate-glow" : undefined}
      />
      <path
        d="M100 26 C 78 26 66 42 64 62 C 62 84 58 104 52 128 C 44 162 40 196 34 228 L 166 228 C 160 196 156 162 148 128 C 142 104 138 84 136 62 C 134 42 122 26 100 26 Z"
        fill={BG}
        stroke={INK}
        strokeWidth="1.8"
        strokeLinejoin="round"
        pathLength={1}
        style={animated ? ({ strokeDasharray: 1, "--len": 1 } as React.CSSProperties) : undefined}
        className={animated ? "animate-draw" : undefined}
      />
      <path d="M100 30 C 84 32 76 44 75 60 C 74 74 76 86 84 92" fill="none" stroke={INK} strokeWidth="1" opacity="0.7" />
      <path d="M100 30 C 116 32 124 44 125 60 C 126 74 124 86 116 92" fill="none" stroke={INK} strokeWidth="1" opacity="0.7" />
      <g transform="rotate(-7 100 64)">
        <ellipse cx="100" cy="64" rx="13" ry="17" fill={INK} />
        <path d="M93 62 q3 2 6 0 M102 62 q3 2 6 0" stroke={BG} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M98 74 q2 1.4 4 0" stroke={BG} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </g>
      <path
        d="M86 90 C 90 124 88 172 84 228 L 116 228 C 112 172 110 124 114 90 C 108 84 92 84 86 90 Z"
        fill={INK}
        stroke={INK}
        strokeWidth="1"
      />
      <path d="M92 130 C 94 160 93 196 91 226 M108 130 C 106 160 107 196 109 226 M100 132 V 226" stroke={BG} strokeWidth="0.8" opacity="0.5" />
      <path d="M100 100 L 94 124 Q 100 130 106 124 Z" fill={BG} />
      <path d="M100 102 V 126" stroke={INK} strokeWidth="0.8" />
      {stars.map(([x, y], i) => (
        <Star key={i} x={x} y={y} s={2.6} />
      ))}
      <path d="M62 234 Q 100 258 138 234 Q 100 248 62 234 Z" fill={INK} />
      <Rose size={44} tone="light" x={18} y={214} />
      <Rose size={44} tone="dark" x={138} y={214} />
      <Rose size={30} tone="light" x={85} y={237} />
    </svg>
  );
}

/** Ornamental divider with a center rose. */
export function OrnamentDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 text-ink", className)} aria-hidden="true">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-line-strong" />
      <Rose size={18} tone="light" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-line-strong" />
    </div>
  );
}

const PETALS = [
  { left: 6, dur: 16, delay: 0, size: 14, sway: 60, tone: "light", op: 0.7 },
  { left: 18, dur: 21, delay: 4, size: 10, sway: -40, tone: "dark", op: 0.9 },
  { left: 29, dur: 18, delay: 9, size: 16, sway: 50, tone: "light", op: 0.5 },
  { left: 41, dur: 24, delay: 2, size: 9, sway: -60, tone: "dark", op: 0.8 },
  { left: 53, dur: 17, delay: 12, size: 13, sway: 45, tone: "light", op: 0.6 },
  { left: 64, dur: 22, delay: 6, size: 11, sway: -35, tone: "dark", op: 0.9 },
  { left: 76, dur: 19, delay: 1, size: 15, sway: 55, tone: "light", op: 0.55 },
  { left: 87, dur: 25, delay: 8, size: 10, sway: -50, tone: "dark", op: 0.85 },
  { left: 95, dur: 20, delay: 14, size: 12, sway: 30, tone: "light", op: 0.6 },
] as const;

/** Falling black & white petals. Purely decorative, disabled with reduced motion. */
export function PetalRain({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {PETALS.map((p, i) => (
        <svg
          key={i}
          viewBox="-10 -12 20 24"
          width={p.size}
          height={p.size * 1.2}
          className="petal"
          style={
            {
              left: `${p.left}%`,
              "--dur": `${p.dur}s`,
              "--delay": `${-p.delay}s`,
              "--sway": `${p.sway}px`,
              "--op": p.op,
            } as React.CSSProperties
          }
        >
          <path
            d="M0 -11 C 8 -6, 9 6, 0 11 C -9 6, -8 -6, 0 -11 Z"
            fill={p.tone === "light" ? INK : BG}
            stroke={p.tone === "light" ? BG : INK}
            strokeWidth="1"
          />
        </svg>
      ))}
    </div>
  );
}

/** The studio's real logo (black on white JPG), inverted to white and blended into the dark background. */
export function Logo({ src = "/logo.jpg", className, alt = "Ram Hair Studio" }: { src?: string; className?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src || "/logo.jpg"} alt={alt} className={cn("logo-invert select-none", className)} draggable={false} />;
}

/** Brand wordmark: blackletter name + spaced small caps. */
export function Wordmark({
  name = "Ram Hair Studio",
  tagline,
  size = "md",
  className,
}: {
  name?: string;
  tagline?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const sub = rest.join(" ");
  const big = { sm: "text-3xl", md: "text-6xl", lg: "text-7xl sm:text-8xl" }[size];
  const small = { sm: "text-[9px] tracking-[0.35em]", md: "text-xs tracking-[0.5em]", lg: "text-sm tracking-[0.6em]" }[size];
  return (
    <div className={cn("flex flex-col items-center leading-none", className)}>
      <span className={cn("font-gothic text-shimmer", big)}>{first}</span>
      {sub && <span className={cn("mt-2 pl-[0.5em] font-medium uppercase text-ink", small)}>{sub}</span>}
      {tagline && <span className="mt-3 font-serif text-base italic text-dim">{tagline}</span>}
    </div>
  );
}
