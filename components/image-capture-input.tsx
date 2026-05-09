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
      const isLargeFile = file.size > 5 * 1024 * 1024 // 5MB

      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const img = new Image()
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas")
              const ctx = canvas.getContext("2d")
              
              if (!ctx) {
                reject(new Error("Contexto canvas não disponível"))
                return
              }

              // Dimensões mais agressivas para mobile
              const MAX_WIDTH = isLargeFile ? 800 : 1024
              const MAX_HEIGHT = isLargeFile ? 800 : 1024
              let width = img.width
              let height = img.height

              // Calcula novo tamanho mantendo proporção
              if (width > height) {
                if (width > MAX_WIDTH) {
                  height = (height * MAX_WIDTH) / width
                  width = MAX_WIDTH
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width = (width * MAX_HEIGHT) / height
                  height = MAX_HEIGHT
                }
              }

              canvas.width = width
              canvas.height = height

              // Desenha imagem redimensionada
              ctx.drawImage(img, 0, 0, width, height)

              // Qualidade mais agressiva para economizar memória
              const quality = isLargeFile ? 0.4 : 0.55

              canvas.toBlob(
                (blob) => {
                  if (blob) {
                    const compressedFile = new File([blob], file.name, {
                      type: "image/jpeg",
                      lastModified: Date.now(),
                    })
                    console.log("[v0] Imagem comprimida:", {
                      original: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                      compressed: `${(blob.size / 1024 / 1024).toFixed(2)}MB`,
                      reduction: `${(((file.size - blob.size) / file.size) * 100).toFixed(0)}%`,
                    })
                    resolve(compressedFile)
                  } else {
                    reject(new Error("Falha ao comprimir imagem (blob vazio)"))
                  }
                },
                "image/jpeg",
                quality,
              )
            } catch (canvasError) {
              console.error("[v0] Erro ao processar canvas:", canvasError)
              reject(new Error("Erro ao processar imagem no canvas"))
            }
          }
          
          img.onerror = () => {
            reject(new Error("Falha ao carregar imagem"))
          }
          
          // Usar blob URL em vez de data URL para economizar memória
          img.src = URL.createObjectURL(file)
        } catch (imgError) {
          console.error("[v0] Erro ao criar Image:", imgError)
          reject(new Error("Erro ao criar objeto de imagem"))
        }
      }

      reader.onerror = () => {
        reject(new Error("Falha ao ler arquivo"))
      }

      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error("[v0] Erro geral na compressão:", error)
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
    if (files && files.length > 0) {
      setIsCompressing(true)

      try {
        console.log("[v0] Iniciando compressão de", files.length, "arquivo(s)")

        // Limita a 3 imagens por vez em mobile para economizar memória
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)
        const maxFiles = isMobileDevice ? 1 : files.length
        const filesToProcess = Array.from(files).slice(0, maxFiles)

        // Comprime cada imagem selecionada com delay para liberar memória
        const compressedFiles = []
        for (const file of filesToProcess) {
          try {
            const compressed = await compressImage(file)
            compressedFiles.push(compressed)
            // Pequeno delay para liberar memória entre compressões
            await new Promise((resolve) => setTimeout(resolve, 100))
          } catch (error) {
            console.error("[v0] Erro ao comprimir arquivo individual:", error)
            // Se falhar, usa original (fallback)
            compressedFiles.push(file)
          }
        }

        // Cria um FileList customizado com as imagens comprimidas
        const dataTransfer = new DataTransfer()
        compressedFiles.forEach((file) => dataTransfer.items.add(file))

        onCapture(dataTransfer.files)
      } catch (error) {
        console.error("[v0] Erro geral ao comprimir imagens:", error)
        // Se falhar completamente, usa arquivos originais
        onCapture(files)
      } finally {
        setIsCompressing(false)
        // Reset input para permitir captura da mesma foto novamente
        e.target.value = ""
      }
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
