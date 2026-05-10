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
    // Configuração otimizada para mobile e desktop
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)
    
    const options = {
      maxSizeMB: isMobileDevice ? 0.5 : 0.9,
      maxWidthOrHeight: isMobileDevice ? 800 : 1600,
      useWebWorker: true,
      fileType: "image/jpeg", // Converte HEIC → JPEG automaticamente
      initialQuality: isMobileDevice ? 0.6 : 0.8,
    }

    const originalSize = (file.size / 1024).toFixed(0)
    console.log(`[v0] 📸 Comprimindo foto: ${file.name} (${originalSize}KB)`)
    
    const compressed = await ImageCompression(file, options)
    
    const compressedSize = (compressed.size / 1024).toFixed(0)
    const reduction = ((1 - compressed.size / file.size) * 100).toFixed(0)
    
    console.log("[v0] ✅ Foto comprimida com sucesso!")
    console.log(`    Original: ${originalSize}KB`)
    console.log(`    Comprimida: ${compressedSize}KB`)
    console.log(`    Redução: ${reduction}%`)
    
    return compressed
  } catch (error) {
    console.error("[v0] Erro na compressão:", error)
    // Fallback: retorna arquivo original se compressão falhar
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
      console.log("[v0] Iniciando compressão de", files.length, "arquivo(s)")

      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)
      
      // Processa apenas 1 arquivo por vez em mobile para evitar pico de memória
      const filesToProcess = isMobileDevice ? [files[0]] : Array.from(files)

      const compressedFiles = []

      for (const file of filesToProcess) {
        if (!file.type.startsWith("image/")) {
          console.warn("[v0] Arquivo ignorado (não é imagem):", file.name)
          continue
        }

        try {
          // PASSO 1: Comprimir ANTES de fazer preview
          const compressed = await compressImage(file)
          compressedFiles.push(compressed)
          
          // PASSO 2: Liberar GC entre arquivos
          await new Promise((resolve) => setTimeout(resolve, 200))
        } catch (error) {
          console.error("[v0] ❌ Falha ao comprimir, usando original:", error)
          compressedFiles.push(file)
        }
      }

      if (compressedFiles.length === 0) {
        console.warn("[v0] Nenhum arquivo foi comprimido")
        return
      }

      // Cria FileList com imagens comprimidas
      const dataTransfer = new DataTransfer()
      compressedFiles.forEach((file) => dataTransfer.items.add(file))

      console.log("[v0] Enviando", compressedFiles.length, "arquivo(s) comprimido(s)")
      onCapture(dataTransfer.files)
    } catch (error) {
      console.error("[v0] Erro geral:", error)
      // Fallback: envia original se compressão falhar totalmente
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
