"use client"

import type React from "react"

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
  return new Promise((resolve, reject) => {
    try {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)
      
      // Em mobile, ser muito mais agressivo
      const MAX_WIDTH = isMobileDevice ? 640 : 1024
      const MAX_HEIGHT = isMobileDevice ? 640 : 1024
      const quality = isMobileDevice ? 0.3 : 0.5

      const reader = new FileReader()
      let blobUrl: string | null = null
      
      reader.onload = (e) => {
        try {
          const img = new Image()
          
          img.onload = () => {
            try {
              // Limpar blob URL após carregar
              if (blobUrl) {
                URL.revokeObjectURL(blobUrl)
              }

              const canvas = document.createElement("canvas")
              const ctx = canvas.getContext("2d", { alpha: false })
              
              if (!ctx) {
                reject(new Error("Canvas context unavailable"))
                return
              }

              let width = img.width
              let height = img.height

              // Resize mantendo proporção
              if (width > height) {
                if (width > MAX_WIDTH) {
                  height = Math.round((height * MAX_WIDTH) / width)
                  width = MAX_WIDTH
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width = Math.round((width * MAX_HEIGHT) / height)
                  height = MAX_HEIGHT
                }
              }

              canvas.width = width
              canvas.height = height

              ctx.fillStyle = "#ffffff"
              ctx.fillRect(0, 0, width, height)
              ctx.drawImage(img, 0, 0, width, height)

              // Usar JPEG para melhor compressão em mobile
              canvas.toBlob(
                (blob) => {
                  try {
                    if (!blob || blob.size === 0) {
                      reject(new Error("Empty blob after compression"))
                      return
                    }

                    const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                      type: "image/jpeg",
                      lastModified: Date.now(),
                    })

                    const reduction = ((1 - blob.size / file.size) * 100).toFixed(0)
                    console.log("[v0] ✅ Foto comprimida com sucesso!")
                    console.log(`    Original: ${(file.size / 1024).toFixed(0)}KB`)
                    console.log(`    Comprimida: ${(blob.size / 1024).toFixed(0)}KB`)
                    console.log(`    Redução: ${reduction}%`)

                    resolve(compressedFile)
                  } catch (e) {
                    console.error("[v0] Erro ao criar File:", e)
                    reject(e)
                  }
                },
                "image/jpeg",
                quality,
              )
            } catch (canvasError) {
              console.error("[v0] Canvas error:", canvasError)
              reject(canvasError)
            }
          }
          
          img.onerror = () => {
            if (blobUrl) URL.revokeObjectURL(blobUrl)
            reject(new Error("Image load failed"))
          }
          
          blobUrl = URL.createObjectURL(file)
          img.src = blobUrl
        } catch (imgError) {
          console.error("[v0] Image creation error:", imgError)
          reject(imgError)
        }
      }

      reader.onerror = () => {
        reject(new Error("File read failed"))
      }

      // Usar ArrayBuffer para economizar memória
      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error("[v0] Compression error:", error)
      reject(error)
    }
  })
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
          const originalSize = (file.size / 1024).toFixed(0)
          console.log(`[v0] 📸 Comprimindo foto: ${file.name} (${originalSize}KB)`)
          const compressed = await compressImage(file)
          compressedFiles.push(compressed)
          
          // Delay para liberar GC
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
