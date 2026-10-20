import type { ComponentType } from "react"
import { Hammer, Laptop, Snowflake } from "lucide-react"
import { FaucetIcon } from "@/components/niche-icons"

type Point = [number, number]
type IconComponent = ComponentType<{ className?: string; strokeWidth?: number | string }>
type Pin =
  | { kind: "avatar"; service: string; label: string; at: Point }
  | { kind: "icon"; icon: IconComponent; label: string; at: Point }

const MOBILE_PINS: Pin[] = [
  { kind: "avatar", service: "eletricista", label: "Eletricista", at: [13, 27] },
  { kind: "icon", icon: Snowflake, label: "Ar-condicionado", at: [29, 22] },
  { kind: "avatar", service: "diarista", label: "Diarista", at: [86, 31] },
  { kind: "icon", icon: Hammer, label: "Marceneiro", at: [7, 47] },
  { kind: "icon", icon: FaucetIcon, label: "Hidráulica", at: [94, 42] },
  { kind: "avatar", service: "pintor", label: "Pintor", at: [11, 69] },
  { kind: "icon", icon: Laptop, label: "Informática", at: [90, 80] },
  { kind: "avatar", service: "pedreiro", label: "Pedreiro", at: [66, 95] },
]

const DESKTOP_PINS: Pin[] = [
  { kind: "icon", icon: FaucetIcon, label: "Hidráulica", at: [6, 26] },
  { kind: "avatar", service: "eletricista", label: "Eletricista", at: [14, 44] },
  { kind: "avatar", service: "diarista", label: "Diarista", at: [23, 66] },
  { kind: "avatar", service: "pintor", label: "Pintor", at: [9, 88] },
  { kind: "icon", icon: Snowflake, label: "Ar-condicionado", at: [80, 25] },
  { kind: "icon", icon: Laptop, label: "Informática", at: [94, 45] },
  { kind: "avatar", service: "pedreiro", label: "Pedreiro", at: [76, 62] },
  { kind: "icon", icon: Hammer, label: "Marceneiro", at: [90, 90] },
]

function MapPin({ pin, index }: { pin: Pin; index: number }) {
  const isAvatar = pin.kind === "avatar"
  const delay = `${(index * 0.45) % 3.6}s`

  return (
    <span
      className="group pointer-events-auto absolute flex -translate-x-1/2 -translate-y-full flex-col items-center hover:z-10"
      style={{ left: `${pin.at[0]}%`, top: `${pin.at[1]}%` }}
      title={pin.label}
    >
      <span className="map-pin-float flex flex-col items-center" style={{ animationDelay: delay }}>
        <span className="flex origin-bottom flex-col items-center opacity-70 saturate-[0.7] transition-[transform,opacity,filter] duration-300 ease-out group-hover:scale-[1.6] group-hover:opacity-100 group-hover:saturate-100">
        <span
          className={`relative flex items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-[#3B73EE] text-white shadow-[0_6px_16px_rgba(6,20,51,0.55)] transition-shadow duration-300 group-hover:shadow-[0_10px_28px_rgba(6,20,51,0.6)] ${
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
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[#2563EB]/45 mix-blend-color transition-opacity duration-300 group-hover:opacity-0"
          />
        </span>
        <span className="-mt-0.5 h-0 w-0 border-x-[7px] border-t-[11px] border-x-transparent border-t-white md:border-x-[8px] md:border-t-[13px]" />
        </span>
      </span>

      <span className="relative mt-0.5 flex h-2 w-5 items-center justify-center opacity-60 transition-opacity duration-300 group-hover:opacity-100">
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
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
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
        <div className="absolute inset-0 bg-[#2563EB]/45 mix-blend-color" />
        <div className="absolute inset-0 bg-[#0B2A6B]/15" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,20,51,0.55)_0%,rgba(6,20,51,0.12)_60%,rgba(6,20,51,0)_100%)]" />

        <PinLayer pins={MOBILE_PINS} className="md:hidden" />
        <PinLayer pins={DESKTOP_PINS} className="hidden md:block" />
      </div>
    </div>
  )
}
