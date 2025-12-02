"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, Copy, CheckCircle2 } from "lucide-react"
import Image from "next/image"

interface UploadedImage {
  url: string
  filename: string
  size: number
  type: string
  category: string
}

export function AdImageUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>("cursos")
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("category", category)

      const response = await fetch("/api/ads/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Falha no upload")

      const data = await response.json()
      setUploadedImages((prev) => [data, ...prev])
      setSelectedFile(null)

      // Reset file input
      const fileInput = document.getElementById("file-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      console.error("Erro no upload:", error)
      alert("Erro ao fazer upload da imagem")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (url: string) => {
    if (!confirm("Tem certeza que deseja deletar esta imagem?")) return

    try {
      const response = await fetch("/api/ads/delete-image", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) throw new Error("Falha ao deletar")

      setUploadedImages((prev) => prev.filter((img) => img.url !== url))
    } catch (error) {
      console.error("Erro ao deletar:", error)
      alert("Erro ao deletar imagem")
    }
  }

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload de Imagens para Anúncios</CardTitle>
          <CardDescription>Faça upload de imagens para usar nos seus anúncios e banners</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cursos">Cursos</SelectItem>
                <SelectItem value="produtos">Produtos</SelectItem>
                <SelectItem value="servicos">Serviços</SelectItem>
                <SelectItem value="banners">Banners</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Selecione uma imagem</Label>
            <Input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
          </div>

          <Button onClick={handleUpload} disabled={!selectedFile || uploading} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Fazendo upload..." : "Upload"}
          </Button>
        </CardContent>
      </Card>

      {uploadedImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Imagens Enviadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploadedImages.map((image) => (
                <div key={image.url} className="border rounded-lg p-4 space-y-3">
                  <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden">
                    <Image src={image.url || "/placeholder.svg"} alt={image.filename} fill className="object-cover" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium truncate">{image.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {image.category} • {(image.size / 1024).toFixed(2)} KB
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(image.url)} className="flex-1">
                        {copiedUrl === image.url ? (
                          <>
                            <CheckCircle2 className="mr-2 h-3 w-3" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-3 w-3" />
                            Copiar URL
                          </>
                        )}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(image.url)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
