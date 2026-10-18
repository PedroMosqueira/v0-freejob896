type Point = [number, number]
type Avatar = { service: string; label: string; at: Point }

type CircuitLayout = {
  avatars: Avatar[]
  roots: number[]
  traces: Point[][]
  vias: Point[]
}

const MOBILE: CircuitLayout = {
  roots: [13, 87],
  avatars: [
    { service: "eletricista", label: "Eletricista", at: [13, 9] },
    { service: "diarista", label: "Diarista", at: [87, 7] },
    { service: "pintor", label: "Pintor", at: [12, 34] },
    { service: "encanador", label: "Encanador", at: [88, 30] },
    { service: "jardineiro", label: "Jardineiro", at: [24, 89] },
    { service: "montador", label: "Montador", at: [76, 89] },
  ],
  traces: [
    [[13, 100], [13, 95], [24, 95], [24, 89]],
    [[13, 100], [13, 95], [4, 95], [4, 34], [12, 34]],
    [[13, 100], [13, 95], [4, 95], [4, 20], [13, 20], [13, 9]],
    [[87, 100], [87, 95], [76, 95], [76, 89]],
    [[87, 100], [87, 95], [96, 95], [96, 30], [88, 30]],
    [[87, 100], [87, 95], [96, 95], [96, 18], [87, 18], [87, 7]],
  ],
  vias: [[13, 95], [87, 95], [4, 95], [96, 95], [4, 34], [96, 30], [4, 20], [96, 18]],
}

const DESKTOP: CircuitLayout = {
  roots: [26, 74],
  avatars: [
    { service: "eletricista", label: "Eletricista", at: [12, 18] },
    { service: "diarista", label: "Diarista", at: [20, 46] },
    { service: "pintor", label: "Pintor", at: [9, 72] },
    { service: "encanador", label: "Encanador", at: [88, 18] },
    { service: "jardineiro", label: "Jardineiro", at: [80, 46] },
    { service: "montador", label: "Montador", at: [91, 72] },
  ],
  traces: [
    [[26, 100], [26, 84], [9, 84], [9, 72]],
    [[26, 100], [26, 60], [20, 60], [20, 46]],
    [[26, 100], [26, 32], [12, 32], [12, 18]],
    [[74, 100], [74, 84], [91, 84], [91, 72]],
    [[74, 100], [74, 60], [80, 60], [80, 46]],
    [[74, 100], [74, 32], [88, 32], [88, 18]],
    [[26, 72], [17, 72], [17, 66]],
    [[74, 72], [83, 72], [83, 66]],
    [[26, 32], [26, 10], [33, 10]],
    [[74, 32], [74, 10], [67, 10]],
  ],
  vias: [
    [26, 84], [74, 84], [26, 60], [74, 60],
    [26, 32], [74, 32], [26, 72], [74, 72], [17, 66], [83, 66], [33, 10], [67, 10],
  ],
}

const toPath = (points: Point[]) =>
  points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ")

function CircuitLayer({ layout, className }: { layout: CircuitLayout; className: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {layout.traces.map((trace) => {
          const d = toPath(trace)
          return (
            <g key={d} fill="none" strokeLinejoin="round" strokeLinecap="round">
              <path d={d} stroke="#6B93FF" strokeOpacity={0.16} strokeWidth={6} vectorEffect="non-scaling-stroke" />
              <path d={d} stroke="#9DB8FF" strokeOpacity={0.75} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              <path
                className="login-circuit-flow"
                d={d}
                stroke="#E6EDFF"
                strokeWidth={2}
                strokeDasharray="6 42"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )
        })}
      </svg>

      {layout.roots.map((x) => (
        <span
          key={x}
          className="absolute bottom-0 h-1.5 w-16 -translate-x-1/2 rounded-t-sm bg-[#9DB8FF] shadow-[0_0_18px_6px_rgba(59,115,238,0.8)]"
          style={{ left: `${x}%` }}
        />
      ))}

      {layout.vias.map(([x, y]) => (
        <span
          key={`${x}-${y}`}
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#9DB8FF] bg-[#050d1f] shadow-[0_0_8px_2px_rgba(107,147,255,0.7)]"
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
