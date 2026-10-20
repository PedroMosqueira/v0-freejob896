import type { ComponentType } from "react"
import { Hammer, Laptop, PaintRoller, Snowflake, Wrench, Zap } from "lucide-react"
import { FaucetIcon, TrowelIcon } from "@/components/niche-icons"

type Point = [number, number]
type IconComponent = ComponentType<{ className?: string; strokeWidth?: number }>
type Pin =
  | { kind: "avatar"; service: string; label: string; at: Point }
  | { kind: "icon"; icon: IconComponent; label: string; at: Point }

const MOBILE_PINS: Pin[] = [
  { kind: "avatar", service: "eletricista", label: "Eletricista", at: [16, 14] },
  { kind: "icon", icon: Zap, label: "Elétrica", at: [50, 9] },
  { kind: "avatar", service: "diarista", label: "Diarista", at: [84, 27] },
  { kind: "icon", icon: Hammer, label: "Marceneiro", at: [8, 38] },
  { kind: "icon", icon: FaucetIcon, label: "Hidráulica", at: [93, 39] },
  { kind: "avatar", service: "pintor", label: "Pintor", at: [12, 72] },
  { kind: "avatar", service: "encanador", label: "Encanador", at: [88, 76] },
  { kind: "icon", icon: TrowelIcon, label: "Pedreiro", at: [34, 96] },
  { kind: "avatar", service: "jardineiro", label: "Jardineiro", at: [62, 97] },
]

const DESKTOP_PINS: Pin[] = [
  { kind: "avatar", service: "eletricista", label: "Eletricista", at: [12, 30] },
  { kind: "icon", icon: Zap, label: "Elétrica", at: [24, 18] },
  { kind: "avatar", service: "diarista", label: "Diarista", at: [20, 58] },
  { kind: "icon", icon: TrowelIcon, label: "Pedreiro", at: [6, 52] },
  { kind: "avatar", service: "pintor", label: "Pintor", at: [10, 86] },
  { kind: "icon", icon: Hammer, label: "Marceneiro", at: [24, 92] },
  { kind: "icon", icon: FaucetIcon, label: "Hidráulica", at: [40, 14] },
  { kind: "icon", icon: Laptop, label: "Informática", at: [62, 12] },
  { kind: "avatar", service: "encanador", label: "Encanador", at: [86, 26] },
  { kind: "icon", icon: Snowflake, label: "Ar-condicionado", at: [76, 18] },
  { kind: "avatar", service: "jardineiro", label: "Jardineiro", at: [80, 56] },
  { kind: "icon", icon: PaintRoller, label: "Pintura", at: [94, 46] },
  { kind: "avatar", service: "montador", label: "Montador", at: [90, 86] },
  { kind: "icon", icon: Wrench, label: "Manutenção", at: [76, 92] },
]

function MapPin({ pin, index }: { pin: Pin; index: number }) {
  const isAvatar = pin.kind === "avatar"
  const delay = `${(index * 0.45) % 3.6}s`

  return (
    <span
      className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
      style={{ left: `${pin.at[0]}%`, top: `${pin.at[1]}%` }}
      title={pin.label}
    >
      <span className="map-pin-float flex flex-col items-center" style={{ animationDelay: delay }}>
        <span
          className={`flex items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-[#3B73EE] text-white shadow-[0_6px_16px_rgba(6,20,51,0.55)] ${
            isAvatar ? "size-12 md:size-16" : "size-9 md:size-11"
          }`}
        >
          {pin.kind === "avatar" ? (
            <img
              src={`/images/services/${pin.service}-avatar.jpg`}
              alt=""
              width={128}
              height={128}
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <pin.icon className="size-4 md:size-5" strokeWidth={2.5} />
          )}
        </span>
        <span className="-mt-0.5 h-0 w-0 border-x-[7px] border-t-[11px] border-x-transparent border-t-white md:border-x-[8px] md:border-t-[13px]" />
      </span>

      <span className="relative mt-0.5 flex h-2 w-5 items-center justify-center">
        <span
          className="map-pin-ping absolute size-5 rounded-full border-2 border-white/80"
          style={{ animationDelay: delay }}
        />
        <span className="h-1.5 w-4 rounded-full bg-[#061433]/50 blur-[1px]" />
      </span>
    </span>
  )
}

function PinLayer({ pins, className }: { pins: Pin[]; className: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      {pins.map((pin, index) => (
        <MapPin key={pin.label} pin={pin} index={index} />
      ))}
    </div>
  )
}

export function LoginBackground() {
  return (
    <div className="absolute inset-0 overflow-clip bg-[#0B2A6B]" aria-hidden="true">
      <style>{`
        @keyframes map-pin-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes map-pin-ping { 0% { transform: scale(0.4); opacity: 0.9; } 80%, 100% { transform: scale(2.2); opacity: 0; } }
        .map-pin-float { animation: map-pin-float 3.6s ease-in-out infinite; }
        .map-pin-ping { animation: map-pin-ping 3.6s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .map-pin-float, .map-pin-ping { animation: none; }
          .map-pin-ping { opacity: 0; }
        }
      `}</style>

      <div className="sticky top-0 h-svh w-full">
        <picture>
          <source media="(min-width: 768px)" srcSet="/images/city-day-desktop.jpg" />
          <img
            src="/images/city-day-mobile.jpg"
            alt=""
            width={768}
            height={1376}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-[#2563EB] mix-blend-color" />
        <div className="absolute inset-0 bg-[#0B2A6B]/35" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,20,51,0.6)_0%,rgba(6,20,51,0.15)_65%,rgba(6,20,51,0)_100%)]" />

        <PinLayer pins={MOBILE_PINS} className="md:hidden" />
        <PinLayer pins={DESKTOP_PINS} className="hidden md:block" />
      </div>
    </div>
  )
}
