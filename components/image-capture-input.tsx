"use client"

import type React from "react"
import { compressImages } from "@/lib/image-compress"
import { Button } from "@/components/ui/button"
import { Camera, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { useHasCamera } from "@/lib/use-has-camera"
import { InAppCamera, isInAppCameraSupported } from "@/components/in-app-camera"

interface ImageCaptureInputProps {
  onCapture: (files: FileList) => void
  multiple?: boolean
  disabled?: boolean
  label?: string
}

export function ImageCaptureInput({
  onCapture,
  multiple = false,
  disabled = false,
  label = "Adicionar foto",
}: ImageCaptureInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [isCompressing, setIsCompressing] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const files = e.target.files
    if (!files || files.length === 0) return

    setIsCompressing(true)

    try {
      const compressedFiles = await compressImages(Array.from(files))
      if (compressedFiles.length === 0) return

      const dataTransfer = new DataTransfer()
      for (const file of compressedFiles) dataTransfer.items.add(file)
      onCapture(dataTransfer.files)
    } catch (error) {
      console.error("Erro ao processar fotos:", error)
      onCapture(files)
    } finally {
      setIsCompressing(false)
      e.target.value = ""
    }
  }

  const handleButtonClick = (inputRef: React.RefObject<HTMLInputElement>) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isCompressing && !disabled) {
      inputRef.current?.click()
    }
  }

  const [isCameraOpen, setIsCameraOpen] = useState(false)

  const handleCameraClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isCompressing || disabled) return
    if (isInAppCameraSupported()) {
      setIsCameraOpen(true)
    } else {
      cameraInputRef.current?.click()
    }
  }

  const handleInAppCapture = (file: File) => {
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    onCapture(dataTransfer.files)
  }

  const handleCameraUnavailable = () => {
    setIsCameraOpen(false)
    cameraInputRef.current?.click()
  }

  const isMobile = useHasCamera()

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      {/* Botão para escolher arquivo */}
      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick(fileInputRef)}
        disabled={disabled || isCompressing}
        className="flex-1 gap-2 bg-transparent"
      >
        <Upload className="h-4 w-4" />
        {isCompressing ? "Processando..." : "Escolher arquivo"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isCompressing}
      />

      {isMobile && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={handleCameraClick}
            disabled={disabled || isCompressing}
            className="flex-1 gap-2 bg-transparent"
          >
            <Camera className="h-4 w-4" />
            {isCompressing ? "Processando..." : "Tirar foto"}
          </Button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isCompressing}
          />
          <InAppCamera
            open={isCameraOpen}
            onClose={() => setIsCameraOpen(false)}
            onCapture={handleInAppCapture}
            onUnavailable={handleCameraUnavailable}
            allowMultiple={multiple}
          />
        </>
      )}
    </div>
  )
}
