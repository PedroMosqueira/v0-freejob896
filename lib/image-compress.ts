"use client"

const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.72

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY))
}

/**
 * Phone cameras produce 12–50MP photos; decoding them at full size in a canvas
 * (what browser-image-compression does) can exhaust memory and crash the tab.
 * createImageBitmap with resize options lets the browser decode straight to a
 * small bitmap, so the full-resolution pixels never live in JS memory.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap === "undefined") return file

  let bitmap: ImageBitmap | null = null
  const canvas = document.createElement("canvas")
  try {
    const probe = await createImageBitmap(file, { imageOrientation: "from-image" })
    const scale = Math.min(1, MAX_DIMENSION / Math.max(probe.width, probe.height))
    const width = Math.round(probe.width * scale)
    const height = Math.round(probe.height * scale)
    probe.close()

    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: "medium",
    })

    canvas.width = width
    canvas.height = height
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0)
    const blob = await canvasToBlob(canvas)
    if (!blob || blob.size >= file.size) return file

    const name = file.name.replace(/\.\w+$/, "") + ".jpg"
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() })
  } catch (error) {
    console.error("Falha ao comprimir imagem:", error)
    return file
  } finally {
    bitmap?.close()
    canvas.width = 0
    canvas.height = 0
  }
}

export async function compressImages(files: Iterable<File>): Promise<File[]> {
  const result: File[] = []
  // Sequential on purpose: decoding several photos in parallel is what runs phones out of memory.
  for (const file of files) {
    if (file.type.startsWith("image/")) result.push(await compressImage(file))
  }
  return result
}
