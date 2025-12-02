import { AdImageUploader } from "@/components/ad-image-uploader"

export default function AdminAdsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Imagens de Anúncios</h1>
        <p className="text-muted-foreground mt-2">Faça upload e gerencie as imagens usadas nos anúncios do site</p>
      </div>
      <AdImageUploader />
    </div>
  )
}
