import { list } from "@vercel/blob"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn("[v0] BLOB_READ_WRITE_TOKEN not configured, returning empty list")
      return NextResponse.json({ files: [] })
    }

    // List only files in the ads folder
    const { blobs } = await list({ prefix: "ads/" })

    const files = blobs.map((blob) => ({
      url: blob.url,
      pathname: blob.pathname,
      filename: blob.pathname.split("/").pop() || "unknown",
      category: blob.pathname.split("/")[1] || "general",
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }))

    return NextResponse.json({ files })
  } catch (error) {
    console.error("Error listing files:", error)
    return NextResponse.json({ error: "Falha ao listar arquivos" }, { status: 500 })
  }
}
