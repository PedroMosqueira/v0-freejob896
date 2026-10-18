import type { SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement> & { strokeWidth?: number }

function BaseIcon({ strokeWidth = 2, children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function TrowelIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M2 22 5 11l8 8z" fill="currentColor" fillOpacity={0.3} />
      <path d="m9 15 6-5.5" />
      <path d="m14 8.5 5-5a1.5 1.5 0 0 1 2 2l-5 5z" />
    </BaseIcon>
  )
}

export function FaucetIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 7v8" />
      <path d="M3 9h10a6 6 0 0 1 6 6v1h-4v-1a2 2 0 0 0-2-2H3" />
      <path d="M9 9V5" />
      <path d="M6 5h6" />
      <path d="M17 19v2" />
    </BaseIcon>
  )
}
