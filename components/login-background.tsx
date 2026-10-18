import type { ComponentType } from "react"
import { Hammer, Laptop, PaintRoller, Snowflake, Wrench, Zap } from "lucide-react"
import { FaucetIcon, TrowelIcon } from "@/components/niche-icons"

type Point = [number, number]
type Avatar = { service: string; label: string; at: Point }
type IconNode = {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  at: Point
}

type CircuitLayout = {
  avatars: Avatar[]
  icons: IconNode[]
  trunk: Point[][]
  branches: Point[][]
}

const ROOTS: Point[][] = [
  [[50, 89], [44, 95], [33, 100]],
  [[50, 95], [47, 100]],
  [[50, 92], [57, 97], [64, 100]],
  [[50, 97], [53, 100]],
]

const MOBILE: CircuitLayout = {
  trunk: [[[50, 100], [50, 48]], ...ROOTS],
  branches: [
    [[50, 86], [40, 80], [22, 80], [14, 86], [14, 90]],
    [[30, 80], [30, 94]],
    [[50, 68], [40, 60], [16, 60], [7, 52], [7, 36], [10, 30]],
    [[50, 54], [42, 48], [26, 48], [20, 42], [20, 18], [12, 10], [12, 8]],
    [[20, 28], [30, 20]],
    [[50, 92], [58, 88], [76, 88], [84, 84]],
    [[66, 88], [66, 96]],
    [[50, 64], [58, 56], [80, 56], [90, 46], [90, 28]],
    [[50, 48], [60, 40], [72, 40], [76, 36], [76, 24], [84, 16], [86, 12]],
    [[76, 30], [68, 24]],
  ],
  avatars: [
    { service: "eletricista", label: "Eletricista", at: [12, 8] },
    { service: "pintor", label: "Pintor", at: [10, 30] },
    { service: "jardineiro", label: "Jardineiro", at: [14, 90] },
    { service: "diarista", label: "Diarista", at: [86, 12] },
    { service: "encanador", label: "Encanador", at: [90, 28] },
    { service: "montador", label: "Montador", at: [84, 84] },
  ],
  icons: [
    { icon: Hammer, label: "Marceneiro", at: [30, 20] },
    { icon: Zap, label: "Elétrica", at: [68, 24] },
    { icon: TrowelIcon, label: "Pedreiro", at: [30, 94] },
    { icon: FaucetIcon, label: "Hidráulica", at: [66, 96] },
  ],
}

const DESKTOP: CircuitLayout = {
  trunk: [[[50, 100], [50, 60]], ...ROOTS],
  branches: [
    [[50, 90], [43, 83], [14, 83], [9, 77], [9, 72]],
    [[26, 83], [26, 73]],
    [[50, 72], [40, 64], [22, 64], [22, 48]],
    [[22, 64], [12, 64], [5, 57], [5, 46]],
    [[50, 60], [44, 56], [32, 56], [32, 40], [22, 30], [16, 24], [16, 18]],
    [[32, 40], [38, 34], [38, 28]],
    [[16, 24], [6, 24], [6, 14]],
    [[50, 94], [56, 88], [80, 88], [88, 80], [88, 64]],
    [[70, 88], [70, 80], [76, 74]],
    [[50, 66], [58, 60], [72, 60], [76, 56], [76, 40]],
    [[76, 48], [88, 48], [94, 42]],
    [[50, 60], [54, 56], [70, 56], [70, 30], [76, 24], [84, 24], [84, 12]],
    [[70, 36], [62, 30], [62, 26]],
    [[84, 24], [94, 24], [94, 30]],
  ],
  avatars: [
    { service: "eletricista", label: "Eletricista", at: [16, 18] },
    { service: "diarista", label: "Diarista", at: [22, 48] },
    { service: "pintor", label: "Pintor", at: [9, 72] },
    { service: "encanador", label: "Encanador", at: [84, 12] },
    { service: "jardineiro", label: "Jardineiro", at: [76, 40] },
    { service: "montador", label: "Montador", at: [88, 64] },
  ],
  icons: [
    { icon: Hammer, label: "Marceneiro", at: [26, 73] },
    { icon: TrowelIcon, label: "Pedreiro", at: [5, 46] },
    { icon: Zap, label: "Elétrica", at: [38, 28] },
    { icon: FaucetIcon, label: "Hidráulica", at: [6, 14] },
    { icon: Wrench, label: "Manutenção", at: [76, 74] },
    { icon: PaintRoller, label: "Pintura", at: [94, 42] },
    { icon: Snowflake, label: "Ar-condicionado", at: [94, 30] },
    { icon: Laptop, label: "Informática", at: [62, 26] },
  ],
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

      {layout.icons.map(({ icon: Icon, label, at: [x, y] }) => (
        <span
          key={label}
          title={label}
          className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#9DB8FF] bg-[#0a1a3d] text-[#E6EDFF] shadow-[0_0_12px_2px_rgba(107,147,255,0.7)] md:size-9"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <Icon className="size-3.5 md:size-4" strokeWidth={2.25} />
        </span>
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
