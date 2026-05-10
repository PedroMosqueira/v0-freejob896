import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const needId = (formData.get("needId") as string) || "temp"

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo fornecido" }, { status: 400 })
    }

    const uploadedUrls: string[] = []

    // Upload each file to Vercel Blob
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        console.warn(`Arquivo ignorado (não é imagem): ${file.name}`)
        continue
      }

      try {
        const filename = `needs/${needId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`
        const blob = await put(filename, file, {
          access: "public",
        })
        uploadedUrls.push(blob.url)
        console.log(`[v0] Upload bem-sucedido: ${filename}`)
      } catch (error) {
        console.error(`[v0] Erro ao fazer upload de ${file.name}:`, error)
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma imagem válida foi enviada" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      urls: uploadedUrls,
      count: uploadedUrls.length,
    })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 })
  }
}
