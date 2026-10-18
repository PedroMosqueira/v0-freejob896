export function LoginBackground() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <picture>
        <source media="(min-width: 768px)" srcSet="/images/login-bg-desktop.jpg" />
        <img
          src="/images/login-bg-mobile.jpg"
          alt=""
          width={768}
          height={1376}
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </picture>
      <div className="absolute inset-0 bg-[#050d1f]/35" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050d1f]/30 via-transparent to-[#050d1f]/75" />
    </div>
  )
}
