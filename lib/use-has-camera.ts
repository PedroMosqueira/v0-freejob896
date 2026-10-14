"use client"

import { useEffect, useState } from "react"

// iPadOS reports a desktop "Macintosh" user agent, so touch support is checked too.
function detectCameraDevice() {
  if (typeof navigator === "undefined") return false
  const mobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const touchMac = /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1
  const coarsePointer = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches
  return mobileUserAgent || touchMac || !!coarsePointer
}

export function useHasCamera() {
  const [hasCamera, setHasCamera] = useState(false)

  useEffect(() => {
    setHasCamera(detectCameraDevice())
  }, [])

  return hasCamera
}
