type Point = { x: number; y: number }
type Avatar = Point & { service: string; label: string }

type NetworkLayout = {
  avatars: Avatar[]
  dots: Point[]
  edges: [number, number][]
}

const MOBILE: NetworkLayout = {
  avatars: [
    { service: "eletricista", label: "Eletricista", x: 13, y: 9 },
    { service: "diarista", label: "Diarista", x: 86, y: 7 },
    { service: "pintor", label: "Pintor", x: 11, y: 34 },
    { service: "encanador", label: "Encanador", x: 88, y: 30 },
    { service: "jardineiro", label: "Jardineiro", x: 12, y: 89 },
    { service: "montador", label: "Montador", x: 88, y: 93 },
  ],
  dots: [
    { x: 50, y: 3 },
    { x: 27, y: 21 },
    { x: 73, y: 18 },
    { x: 50, y: 97 },
    { x: 33, y: 78 },
    { x: 68, y: 83 },
  ],
  // avatar indices 0-5, dot indices 6+
  edges: [
    [0, 6], [6, 1], [0, 7], [7, 2], [1, 8], [8, 3], [7, 8],
    [2, 10], [10, 4], [3, 11], [11, 5], [4, 9], [9, 5], [10, 11],
  ],
}

const DESKTOP: NetworkLayout = {
  avatars: [
    { service: "eletricista", label: "Eletricista", x: 11, y: 18 },
    { service: "diarista", label: "Diarista", x: 23, y: 46 },
    { service: "pintor", label: "Pintor", x: 9, y: 76 },
    { service: "encanador", label: "Encanador", x: 89, y: 20 },
    { service: "jardineiro", label: "Jardineiro", x: 77, y: 52 },
    { service: "montador", label: "Montador", x: 90, y: 80 },
  ],
  dots: [
    { x: 22, y: 9 },
    { x: 4, y: 46 },
    { x: 20, y: 90 },
    { x: 78, y: 8 },
    { x: 96, y: 50 },
    { x: 79, y: 91 },
    { x: 40, y: 5 },
    { x: 60, y: 95 },
  ],
  edges: [
    [0, 6], [0, 7], [0, 1], [7, 1], [7, 2], [1, 2], [2, 8], [1, 8],
    [3, 9], [3, 10], [3, 4], [10, 4], [10, 5], [4, 5], [5, 11], [4, 11],
    [6, 12], [12, 9], [8, 13], [13, 11],
  ],
}

function NetworkLayer({ layout, className }: { layout: NetworkLayout; className: string }) {
  const points: Point[] = [...layout.avatars, ...layout.dots]

  return (
    <div className={`absolute inset-0 ${className}`}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {layout.edges.map(([from, to]) => {
          const a = points[from]
          const b = points[to]
          return (
            <g key={`${from}-${to}`}>
              <line
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#6B93FF" strokeOpacity={0.18} strokeWidth={5}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#9DB8FF" strokeOpacity={0.7} strokeWidth={1.25}
                vectorEffect="non-scaling-stroke"
              />
              <line
                className="login-network-flow"
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#DCE6FF" strokeWidth={1.5} strokeLinecap="round"
                strokeDasharray="2 22"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )
        })}
      </svg>

      {layout.dots.map((dot) => (
        <span
          key={`${dot.x}-${dot.y}`}
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#DCE6FF] shadow-[0_0_10px_3px_rgba(107,147,255,0.85)]"
          style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
        />
      ))}

      {layout.avatars.map((avatar, index) => (
        <span
          key={avatar.service}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${avatar.x}%`, top: `${avatar.y}%` }}
        >
          <span
            className="login-network-halo absolute -inset-2 rounded-full bg-[#3B73EE]/40 blur-md"
            style={{ animationDelay: `${index * 0.6}s` }}
          />
          <img
            src={`/images/services/${avatar.service}-avatar.jpg`}
            alt=""
            title={avatar.label}
            width={192}
            height={192}
            decoding="async"
            className="relative size-11 rounded-full border-2 border-[#9DB8FF] object-cover shadow-[0_0_16px_2px_rgba(59,115,238,0.8)] md:size-16"
          />
        </span>
      ))}
    </div>
  )
}

export function LoginBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#050d1f]" aria-hidden="true">
      <style>{`
        @keyframes login-network-flow { to { stroke-dashoffset: -48; } }
        @keyframes login-network-halo { 0%, 100% { opacity: 0.35; transform: scale(0.95); } 50% { opacity: 0.9; transform: scale(1.1); } }
        .login-network-flow { animation: login-network-flow 2.4s linear infinite; }
        .login-network-halo { animation: login-network-halo 3.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .login-network-flow, .login-network-halo { animation: none; }
        }
      `}</style>

      <div className="sticky top-0 h-svh w-full">
        <picture>
          <source media="(min-width: 768px)" srcSet="/images/city-desktop.jpg" />
          <img
            src="/images/city-mobile.jpg"
            alt=""
            width={768}
            height={1376}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-[#050d1f]/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,13,31,0.55)_0%,rgba(5,13,31,0.1)_70%)]" />

        <NetworkLayer layout={MOBILE} className="md:hidden" />
        <NetworkLayer layout={DESKTOP} className="hidden md:block" />
      </div>
    </div>
  )
}
