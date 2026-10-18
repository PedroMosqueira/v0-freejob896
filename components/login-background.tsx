type Point = [number, number]
type Avatar = { service: string; label: string; at: Point }

type CircuitLayout = {
  avatars: Avatar[]
  trunk: Point[][]
  branches: Point[][]
  terminals: Point[]
}

const mirror = (points: Point[]): Point[] => points.map(([x, y]) => [100 - x, y])
const mirrorAll = (paths: Point[][]) => [...paths, ...paths.map(mirror)]

const ROOTS: Point[][] = [
  [[50, 90], [45, 96], [36, 100]],
  [[50, 95], [47, 100]],
]

const MOBILE_LEFT: Point[][] = [
  [[50, 86], [42, 80], [16, 80], [10, 74], [10, 72]],
  [[50, 70], [42, 64], [16, 64], [8, 56], [8, 38], [10, 32]],
  [[50, 56], [42, 50], [28, 50], [22, 44], [22, 24], [14, 16], [14, 10]],
  [[22, 30], [30, 22]],
  [[30, 64], [30, 58]],
  [[28, 80], [28, 72]],
]

const MOBILE: CircuitLayout = {
  trunk: [[[50, 100], [50, 56]], ...mirrorAll(ROOTS)],
  branches: mirrorAll(MOBILE_LEFT),
  avatars: [
    { service: "eletricista", label: "Eletricista", at: [14, 10] },
    { service: "pintor", label: "Pintor", at: [10, 32] },
    { service: "jardineiro", label: "Jardineiro", at: [10, 72] },
    { service: "diarista", label: "Diarista", at: [86, 10] },
    { service: "encanador", label: "Encanador", at: [90, 32] },
    { service: "montador", label: "Montador", at: [90, 72] },
  ],
  terminals: [[30, 22], [70, 22], [30, 58], [70, 58], [28, 72], [72, 72]],
}

const DESKTOP_LEFT: Point[][] = [
  [[50, 86], [42, 78], [14, 78], [8, 70]],
  [[50, 68], [42, 60], [28, 60], [20, 54], [20, 50]],
  [[50, 54], [44, 50], [34, 50], [22, 38], [14, 30], [14, 22]],
  [[42, 78], [34, 70], [34, 64]],
  [[28, 60], [12, 60], [6, 54], [6, 46]],
  [[30, 46], [30, 32]],
  [[14, 30], [6, 30], [6, 20]],
]

const DESKTOP: CircuitLayout = {
  trunk: [[[50, 100], [50, 54]], ...mirrorAll(ROOTS)],
  branches: mirrorAll(DESKTOP_LEFT),
  avatars: [
    { service: "eletricista", label: "Eletricista", at: [14, 22] },
    { service: "diarista", label: "Diarista", at: [20, 50] },
    { service: "pintor", label: "Pintor", at: [8, 70] },
    { service: "encanador", label: "Encanador", at: [86, 22] },
    { service: "jardineiro", label: "Jardineiro", at: [80, 50] },
    { service: "montador", label: "Montador", at: [92, 70] },
  ],
  terminals: [[34, 64], [66, 64], [6, 46], [94, 46], [30, 32], [70, 32], [6, 20], [94, 20]],
}

const toPath = (points: Point[]) =>
  points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ")

function Trace({ points, width }: { points: Point[]; width: number }) {
  const d = toPath(points)
  return (
    <g fill="none" strokeLinejoin="round" strokeLinecap="round">
      <path d={d} stroke="#6B93FF" strokeOpacity={0.16} strokeWidth={width * 4} vectorEffect="non-scaling-stroke" />
      <path d={d} stroke="#9DB8FF" strokeOpacity={0.8} strokeWidth={width} vectorEffect="non-scaling-stroke" />
      <path
        className="login-circuit-flow"
        d={d}
        stroke="#E6EDFF"
        strokeWidth={width + 0.5}
        strokeDasharray="6 42"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  )
}

function CircuitLayer({ layout, className }: { layout: CircuitLayout; className: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {layout.trunk.map((points) => (
          <Trace key={toPath(points)} points={points} width={3} />
        ))}
        {layout.branches.map((points) => (
          <Trace key={toPath(points)} points={points} width={1.75} />
        ))}
      </svg>

      {layout.terminals.map(([x, y]) => (
        <span
          key={`${x}-${y}`}
          className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#9DB8FF] bg-[#050d1f] shadow-[0_0_10px_2px_rgba(107,147,255,0.7)] md:size-4"
          style={{ left: `${x}%`, top: `${y}%` }}
        />
      ))}

      {layout.avatars.map((avatar, index) => (
        <span
          key={avatar.service}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${avatar.at[0]}%`, top: `${avatar.at[1]}%` }}
        >
          <span
            className="login-circuit-halo absolute -inset-2 rounded-full bg-[#3B73EE]/40 blur-md"
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
        @keyframes login-circuit-flow { to { stroke-dashoffset: -96; } }
        @keyframes login-circuit-halo { 0%, 100% { opacity: 0.35; transform: scale(0.95); } 50% { opacity: 0.9; transform: scale(1.1); } }
        .login-circuit-flow { animation: login-circuit-flow 2.8s linear infinite; }
        .login-circuit-halo { animation: login-circuit-halo 3.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .login-circuit-flow, .login-circuit-halo { animation: none; }
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
        <div className="absolute inset-0 bg-[#050d1f]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,13,31,0.55)_0%,rgba(5,13,31,0.1)_70%)]" />

        <CircuitLayer layout={MOBILE} className="md:hidden" />
        <CircuitLayer layout={DESKTOP} className="hidden md:block" />
      </div>
    </div>
  )
}
