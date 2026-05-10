"use client"

import type React from "react"
import ImageCompression from "browser-image-compression"
import { Button } from "@/components/ui/button"
import { Camera, Upload } from "lucide-react"
import { useRef, useState } from "react"

interface ImageCaptureInputProps {
  onCapture: (files: FileList) => void
  multiple?: boolean
  disabled?: boolean
  label?: string
}

async function compressImage(file: File): Promise<File> {
  try {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)
    
    const originalSize = file.size / 1024 / 1024
    console.log(`[v0] Original: ${originalSize.toFixed(2)}MB`)
    
    // Comprimir com JPEG (mais compatível que WebP)
    const compressed = await ImageCompression(file, {
      maxSizeMB: isMobileDevice ? 0.5 : 0.8,
      maxWidthOrHeight: isMobileDevice ? 800 : 1600,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: isMobileDevice ? 0.65 : 0.85,
    })
    
    const compressedSize = compressed.size / 1024 / 1024
    console.log(`[v0] Comprimida: ${compressedSize.toFixed(2)}MB`)
    
    return compressed
  } catch (error) {
    console.error("[v0] Erro na compressão:", error)
    return file
  }
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
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // Processar TODAS as fotos, uma por vez para não sobrecarregar memória
      const filesToProcess = Array.from(files)

      const compressedFiles: File[] = []

      for (const file of filesToProcess) {
        if (!file.type.startsWith("image/")) {
          console.warn("[v0] Arquivo ignorado:", file.name)
          continue
        }

        try {
          const compressed = await compressImage(file)
          compressedFiles.push(compressed)
          
          // Liberar GC entre arquivos (agressivo em mobile)
          await new Promise((resolve) => setTimeout(resolve, isMobileDevice ? 300 : 100))
        } catch (error) {
          console.error("[v0] Falha ao comprimir:", error)
          compressedFiles.push(file)
        }
      }

      if (compressedFiles.length === 0) {
        return
      }
      
      // Criar novo FileList
      const dataTransfer = new DataTransfer()
      compressedFiles.forEach((file) => {
        dataTransfer.items.add(file)
      })

      onCapture(dataTransfer.files)
    } catch (error) {
      console.error("[v0] Erro fatal:", error)
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

  const isMobile =
    typeof window !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

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
            onClick={handleButtonClick(cameraInputRef)}
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
            multiple={multiple}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || isCompressing}
          />
        </>
      )}
    </div>
  )
}
