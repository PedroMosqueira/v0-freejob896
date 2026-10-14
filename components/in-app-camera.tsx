"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Camera, Check, Loader2, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.8

interface InAppCameraProps {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
  /** Called when the browser can't stream the camera, so the caller can fall back to the native picker. */
  onUnavailable: () => void
  allowMultiple?: boolean
}

export function isInAppCameraSupported() {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext
}

/**
 * Opening the phone's camera app via <input capture> sends the browser to the
 * background, and Android often kills the tab to free memory for the camera,
 * losing the photo and the form. Streaming the camera inside the page keeps the
 * browser in the foreground, the same way native apps do it.
 */
export function InAppCamera({ open, onClose, onCapture, onUnavailable, allowMultiple = true }: InAppCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [isReady, setIsReady] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedCount, setCapturedCount] = useState(0)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (!open) {
      setCapturedCount(0)
      return
    }

    let cancelled = false
    setIsReady(false)

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play().catch(() => {})
        setIsReady(true)
      })
      .catch((error) => {
        if (cancelled) return
        console.error("Câmera indisponível no navegador:", error)
        onUnavailable()
      })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
    // onUnavailable is intentionally excluded so a new callback identity doesn't restart the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facingMode])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [open, onClose])

  const handleCapture = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || isCapturing) return

    setIsCapturing(true)
    setFlash(true)
    setTimeout(() => setFlash(false), 150)

    const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY))
    canvas.width = 0
    canvas.height = 0
    setIsCapturing(false)

    if (!blob) return
    onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() }))
    setCapturedCount((count) => count + 1)
    if (!allowMultiple) onClose()
  }

  if (!open) return null

  // Portaled to body because a transformed ancestor (e.g. a centered Radix dialog) breaks `fixed`.
  // pointer-events-auto overrides the `pointer-events: none` Radix puts on body while a dialog is open.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Câmera"
      className="pointer-events-auto fixed inset-0 z-[100] flex flex-col bg-black text-white"
    >
      <div className="flex items-center justify-between p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/10 hover:text-white"
          aria-label="Fechar câmera"
        >
          <X className="h-6 w-6" />
        </Button>
        {capturedCount > 0 && (
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm" aria-live="polite">
            {capturedCount} {capturedCount === 1 ? "foto adicionada" : "fotos adicionadas"}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setFacingMode((mode) => (mode === "environment" ? "user" : "environment"))}
          className="text-white hover:bg-white/10 hover:text-white"
          aria-label="Trocar câmera"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`h-full w-full object-contain ${facingMode === "user" ? "-scale-x-100" : ""}`}
        />
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-white/80">
            <Loader2 className="h-8 w-8 animate-spin" />
            Abrindo câmera...
          </div>
        )}
        {flash && <div className="pointer-events-none absolute inset-0 bg-white/70" />}
      </div>

      <div className="flex items-center justify-around px-6 pb-8 pt-6">
        <div className="w-16" />
        <button
          type="button"
          onClick={handleCapture}
          disabled={!isReady || isCapturing}
          aria-label="Tirar foto"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 transition active:scale-95 disabled:opacity-50"
        >
          <Camera className="h-8 w-8" />
        </button>
        <div className="flex w-16 justify-center">
          {capturedCount > 0 && (
            <Button
              type="button"
              onClick={onClose}
              size="icon"
              className="h-12 w-12 rounded-full bg-green-600 text-white hover:bg-green-700"
              aria-label="Concluir"
            >
              <Check className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
