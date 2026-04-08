"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { X } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface ImageViewerDialogProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  alt: string
}

export default function ImageViewerDialog({ isOpen, onClose, imageUrl, alt }: ImageViewerDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black/90">
        <DialogTitle className="sr-only">Visualizar Imagem</DialogTitle>
        
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
          <img src={imageUrl || "/placeholder.svg"} alt={alt} className="w-full h-auto max-h-[85vh] object-contain" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
