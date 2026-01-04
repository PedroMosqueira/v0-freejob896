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
    // Limite de memória - se arquivo for maior que 10MB, comprimir mais agressivamente
    const isLargeFile = file.size > 10 * 1024 * 1024

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        const MAX_WIDTH = isLargeFile ? 1024 : 1280
        const MAX_HEIGHT = isLargeFile ? 1024 : 1280
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
        ctx?.drawImage(img, 0, 0, width, height)

        const quality = isLargeFile ? 0.5 : 0.6

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
              reject(new Error("Falha ao comprimir imagem"))
            }
          },
          "image/jpeg",
          quality,
        )
      }
      img.onerror = () => reject(new Error("Falha ao carregar imagem"))
    }
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"))
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

        // Comprime cada imagem selecionada
        const compressedFiles = await Promise.all(
          Array.from(files).map(async (file) => {
            try {
              return await compressImage(file)
            } catch (error) {
              console.error("[v0] Erro ao comprimir arquivo individual:", error)
              // Se falhar, retorna original (fallback)
              return file
            }
          }),
        )

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
