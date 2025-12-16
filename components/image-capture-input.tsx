"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Camera, Upload } from "lucide-react"
import { useRef } from "react"

interface ImageCaptureInputProps {
  onCapture: (files: FileList) => void
  multiple?: boolean
  disabled?: boolean
  label?: string
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        // Define tamanho máximo (reduz imagens grandes)
        const MAX_WIDTH = 1920
        const MAX_HEIGHT = 1920
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

        // Converte para Blob com qualidade reduzida (70%)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              reject(new Error("Falha ao comprimir imagem"))
            }
          },
          "image/jpeg",
          0.7,
        )
      }
      img.onerror = reject
    }
    reader.onerror = reject
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const files = e.target.files
    if (files && files.length > 0) {
      try {
        // Comprime cada imagem selecionada
        const compressedFiles = await Promise.all(Array.from(files).map((file) => compressImage(file)))

        // Cria um FileList customizado com as imagens comprimidas
        const dataTransfer = new DataTransfer()
        compressedFiles.forEach((file) => dataTransfer.items.add(file))

        onCapture(dataTransfer.files)
      } catch (error) {
        console.error("[v0] Erro ao comprimir imagem:", error)
        // Se falhar, usa arquivos originais como fallback
        onCapture(files)
      }

      // Reset input para permitir captura da mesma foto novamente
      e.target.value = ""
    }
  }

  const handleButtonClick = (inputRef: React.RefObject<HTMLInputElement>) => (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    inputRef.current?.click()
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Botão para escolher arquivo */}
      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick(fileInputRef)}
        disabled={disabled}
        className="flex-1 gap-2 bg-transparent"
      >
        <Upload className="h-4 w-4" />
        Escolher arquivo
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Botão para tirar foto com câmera */}
      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick(cameraInputRef)}
        disabled={disabled}
        className="flex-1 gap-2 bg-transparent"
      >
        <Camera className="h-4 w-4" />
        Tirar foto
      </Button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  )
}
