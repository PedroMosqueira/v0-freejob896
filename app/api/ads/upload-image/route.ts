import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const category = (formData.get("category") as string) || "general"

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo fornecido" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Apenas imagens são permitidas" }, { status: 400 })
    }

    // Upload to Vercel Blob with organized path
    const filename = `ads/${category}/${Date.now()}-${file.name}`
    const blob = await put(filename, file, {
      access: "public",
    })

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      type: file.type,
      category,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Falha no upload" }, { status: 500 })
  }
}
