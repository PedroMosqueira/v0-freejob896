const SERVICES = [
  "eletricista",
  "diarista",
  "pintor",
  "encanador",
  "jardineiro",
  "montador",
] as const

export function LoginBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#050d1f]" aria-hidden="true">
      <div className="absolute -top-16 -bottom-16 left-0 right-0 flex flex-col gap-1 bg-[#3B73EE]/70 md:top-0 md:bottom-0 md:-left-24 md:-right-24 md:flex-row">
        {SERVICES.map((service, index) => (
          <div
            key={service}
            className={`relative flex-1 overflow-hidden -skew-y-6 md:block md:skew-y-0 md:-skew-x-[8deg] ${
              index >= 4 ? "hidden" : ""
            }`}
          >
            <img
              src={`/images/services/${service}.jpg`}
              alt=""
              width={900}
              height={900}
              fetchPriority={index < 3 ? "high" : "auto"}
              decoding="async"
              className="absolute -top-1/4 left-0 h-[150%] w-full max-w-none object-cover object-[center_35%] skew-y-6 md:object-center md:top-0 md:-left-1/4 md:h-full md:w-[150%] md:skew-y-0 md:skew-x-[8deg]"
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[#050d1f]/45" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,13,31,0.6)_0%,rgba(5,13,31,0.15)_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050d1f]/50 via-transparent to-[#050d1f]/70" />
    </div>
  )
}
