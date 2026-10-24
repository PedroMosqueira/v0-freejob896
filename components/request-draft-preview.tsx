"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Camera, Check, Eye, Globe, Image as ImageIcon, Loader2, MapPin, Pencil, X } from "lucide-react"

export interface DraftInfo {
  title?: string
  description?: string
  category?: string
  city?: string
  state?: string
  neighborhood?: string
  isRemote?: boolean
}

type EditableField = "title" | "category" | "description" | "location"

interface RequestDraftPreviewProps {
  info: DraftInfo
  photos: File[]
  categories: string[]
  isMobile: boolean
  isLocating: boolean
  isProcessingPhotos: boolean
  locationError: string | null
  onChange: (patch: Partial<DraftInfo>) => void
  onUseLocation: () => void
  onManualLocation: (location: { city: string; state: string; neighborhood: string }) => Promise<void>
  onAddPhotos: (source: "camera" | "gallery") => void
  onRemovePhoto: (index: number) => void
  onConfirm: () => void
  onEditInForm?: () => void
}

export function RequestDraftPreview({
  info,
  photos,
  categories,
  isMobile,
  isLocating,
  isProcessingPhotos,
  locationError,
  onChange,
  onUseLocation,
  onManualLocation,
  onAddPhotos,
  onRemovePhoto,
  onConfirm,
  onEditInForm,
}: RequestDraftPreviewProps) {
  const [editing, setEditing] = useState<EditableField | null>(null)
  const [showCard, setShowCard] = useState(false)
  const photoUrls = usePhotoUrls(photos)

  const hasLocation = Boolean(info.city)
  const missing = [
    !info.title?.trim() && "título",
    !info.description?.trim() && "descrição",
    !hasLocation && "localização",
    photos.length === 0 && "uma foto",
  ].filter(Boolean) as string[]

  const locationLabel = hasLocation
    ? `${info.neighborhood ? `${info.neighborhood}, ` : ""}${info.city}${info.state ? ` - ${info.state}` : ""}`
    : null

  return (
    <section aria-label="Prévia do pedido" className="overflow-hidden rounded-lg border border-blue-200 bg-white text-sm">
      <header className="flex items-center justify-between gap-2 border-b border-blue-100 bg-blue-50 px-3 py-2">
        <h3 className="font-semibold text-blue-900">Prévia do pedido</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowCard((v) => !v)}
          aria-pressed={showCard}
          className="h-7 gap-1.5 px-2 text-xs text-blue-700 hover:bg-blue-100 hover:text-blue-800"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          {showCard ? "Ocultar card" : "Ver card"}
        </Button>
      </header>

      {showCard && (
        <div className="border-b border-blue-100 bg-gray-50 p-3">
          <p className="mb-2 text-xs text-gray-500">Assim os profissionais vão ver seu pedido na lista:</p>
          <CardPreview info={info} imageUrl={photoUrls[0]} locationLabel={locationLabel} />
        </div>
      )}

      <dl className="divide-y divide-gray-100">
        <TextField
          label="Serviço"
          value={info.title}
          isEditing={editing === "title"}
          onEdit={() => setEditing("title")}
          onCancel={() => setEditing(null)}
          onSave={(title) => {
            onChange({ title })
            setEditing(null)
          }}
        />

        <Row
          label="Categoria"
          isEditing={editing === "category"}
          onEdit={() => setEditing("category")}
          display={info.category || "Não definida"}
        >
          <select
            autoFocus
            aria-label="Categoria"
            value={info.category || "Outros"}
            onChange={(e) => {
              onChange({ category: e.target.value })
              setEditing(null)
            }}
            onBlur={() => setEditing(null)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Row>

        <TextField
          label="Descrição"
          value={info.description}
          multiline
          isEditing={editing === "description"}
          onEdit={() => setEditing("description")}
          onCancel={() => setEditing(null)}
          onSave={(description) => {
            onChange({ description })
            setEditing(null)
          }}
        />

        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <dt className="text-xs font-medium text-gray-500">Atendimento</dt>
            <dd className="text-gray-900">{info.isRemote ? "Remoto ou presencial" : "Presencial"}</dd>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={info.isRemote === true}
              onChange={(e) => onChange({ isRemote: e.target.checked })}
              className="h-4 w-4 accent-blue-600"
            />
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            Remoto
          </label>
        </div>

        <LocationRow
          label={locationLabel}
          info={info}
          isEditing={editing === "location" || !hasLocation}
          canCancel={hasLocation}
          isLocating={isLocating}
          error={locationError}
          onEdit={() => setEditing("location")}
          onCancel={() => setEditing(null)}
          onUseLocation={onUseLocation}
          onManual={async (location) => {
            await onManualLocation(location)
            setEditing(null)
          }}
        />

        <div className="flex flex-col gap-2 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-xs font-medium text-gray-500">
              Fotos {photos.length === 0 && <span className="text-amber-700">(obrigatório)</span>}
            </dt>
            <div className="flex gap-1">
              {isMobile && (
                <Button type="button" variant="ghost" size="sm" onClick={() => onAddPhotos("camera")} className="h-7 gap-1 px-2 text-xs text-blue-700">
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  Câmera
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => onAddPhotos("gallery")} className="h-7 gap-1 px-2 text-xs text-blue-700">
                <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Galeria
              </Button>
            </div>
          </div>
          <dd className="flex flex-wrap gap-2">
            {photoUrls.map((url, index) => (
              <div key={url} className="relative h-14 w-14 overflow-hidden rounded-md border border-gray-200">
                <img src={url} alt={`Foto ${index + 1} do pedido`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemovePhoto(index)}
                  aria-label={`Remover foto ${index + 1}`}
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900/70 text-white hover:bg-gray-900"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            ))}
            {isProcessingPhotos && (
              <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-gray-300">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-label="Processando foto" />
              </div>
            )}
            {photos.length === 0 && !isProcessingPhotos && (
              <p className="text-xs text-gray-500">Uma foto ajuda o profissional a entender e orçar o serviço.</p>
            )}
          </dd>
        </div>
      </dl>

      <footer className="flex flex-col gap-2 border-t border-blue-100 bg-blue-50/50 p-3">
        {missing.length > 0 && (
          <p className="text-xs text-gray-600">Falta: {missing.join(", ")}.</p>
        )}
        <Button
          type="button"
          onClick={onConfirm}
          disabled={missing.length > 0 || isProcessingPhotos || editing !== null}
          className="w-full bg-green-600 text-sm hover:bg-green-700"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Confirmar e enviar
        </Button>
        {onEditInForm && (
          <button type="button" onClick={onEditInForm} className="text-xs text-gray-500 underline-offset-2 hover:underline">
            Prefiro editar no formulário
          </button>
        )}
      </footer>
    </section>
  )
}

function Row({
  label,
  display,
  isEditing,
  onEdit,
  children,
}: {
  label: string
  display: React.ReactNode
  isEditing: boolean
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <dt className="text-xs font-medium text-gray-500">{label}</dt>
        {!isEditing && <EditButton label={label} onClick={onEdit} />}
      </div>
      <dd className="text-gray-900">{isEditing ? children : display}</dd>
    </div>
  )
}

function TextField({
  label,
  value,
  multiline = false,
  isEditing,
  onEdit,
  onSave,
  onCancel,
}: {
  label: string
  value?: string
  multiline?: boolean
  isEditing: boolean
  onEdit: () => void
  onSave: (value: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(value ?? "")

  useEffect(() => {
    if (isEditing) setDraft(value ?? "")
  }, [isEditing, value])

  const save = () => {
    if (draft.trim()) onSave(draft.trim())
  }

  return (
    <Row
      label={label}
      isEditing={isEditing}
      onEdit={onEdit}
      display={
        value ? (
          <span className={multiline ? "whitespace-pre-line text-pretty leading-relaxed" : "font-medium"}>{value}</span>
        ) : (
          <span className="text-gray-400">Não definido</span>
        )
      }
    >
      <div className="flex flex-col gap-2">
        {multiline ? (
          <Textarea autoFocus aria-label={label} value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} />
        ) : (
          <Input
            autoFocus
            aria-label={label}
            value={draft}
            maxLength={120}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return
              e.preventDefault()
              save()
            }}
          />
        )}
        <SaveCancel onSave={save} onCancel={onCancel} disabled={!draft.trim()} />
      </div>
    </Row>
  )
}

function LocationRow({
  label,
  info,
  isEditing,
  canCancel,
  isLocating,
  error,
  onEdit,
  onCancel,
  onUseLocation,
  onManual,
}: {
  label: string | null
  info: DraftInfo
  isEditing: boolean
  canCancel: boolean
  isLocating: boolean
  error: string | null
  onEdit: () => void
  onCancel: () => void
  onUseLocation: () => void
  onManual: (location: { city: string; state: string; neighborhood: string }) => Promise<void>
}) {
  const [manual, setManual] = useState({ city: "", state: "", neighborhood: "" })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isEditing) setManual({ city: info.city ?? "", state: info.state ?? "", neighborhood: info.neighborhood ?? "" })
  }, [isEditing, info.city, info.state, info.neighborhood])

  const saveManual = async () => {
    setIsSaving(true)
    try {
      await onManual(manual)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Row
      label="Local"
      isEditing={isEditing}
      onEdit={onEdit}
      display={<span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />{label}</span>}
    >
      <div className="flex flex-col gap-2">
        <Button type="button" onClick={onUseLocation} disabled={isLocating} size="sm" className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
          {isLocating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MapPin className="h-4 w-4" aria-hidden="true" />}
          {isLocating ? "Localizando..." : "Usar minha localização"}
        </Button>
        <p className="text-center text-xs text-gray-400">ou digite</p>
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <Input aria-label="Cidade" placeholder="Cidade" value={manual.city} onChange={(e) => setManual((m) => ({ ...m, city: e.target.value }))} />
          <Input aria-label="Estado" placeholder="UF" maxLength={2} value={manual.state} onChange={(e) => setManual((m) => ({ ...m, state: e.target.value.toUpperCase() }))} />
        </div>
        <Input aria-label="Bairro" placeholder="Bairro" value={manual.neighborhood} onChange={(e) => setManual((m) => ({ ...m, neighborhood: e.target.value }))} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={saveManual} disabled={!manual.city.trim() || !manual.state.trim() || isSaving} className="flex-1">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Salvar local"}
          </Button>
          {canCancel && (
            <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </Row>
  )
}

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Editar ${label.toLowerCase()}`}
      className="flex h-6 items-center gap-1 rounded px-1.5 text-xs text-blue-700 hover:bg-blue-50"
    >
      <Pencil className="h-3 w-3" aria-hidden="true" />
      Editar
    </button>
  )
}

function SaveCancel({ onSave, onCancel, disabled }: { onSave: () => void; onCancel: () => void; disabled?: boolean }) {
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" onClick={onSave} disabled={disabled} className="flex-1">
        Salvar
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="flex-1">
        Cancelar
      </Button>
    </div>
  )
}

function CardPreview({ info, imageUrl, locationLabel }: { info: DraftInfo; imageUrl?: string; locationLabel: string | null }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-60 overflow-hidden border border-gray-300 bg-gray-200 shadow-md">
      <img src={imageUrl || "/service-professional.jpg"} alt="Prévia da imagem do card" className="h-full w-full object-cover" />
      {info.isRemote && (
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-600/90 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
          <Globe className="h-3 w-3" aria-hidden="true" />
          Remoto
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-gray-900/95 via-gray-800/90 to-transparent p-2 pt-6">
        <h4 className="line-clamp-1 text-sm font-semibold text-white">{info.title || "Título do serviço"}</h4>
        {locationLabel && <span className="line-clamp-1 text-[11px] text-gray-300">{locationLabel}</span>}
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] text-green-300">Aberto</span>
          {info.category && <span className="text-[10px] text-gray-300">{info.category}</span>}
        </div>
        <p className="line-clamp-2 text-[12px] text-gray-200">{info.description}</p>
      </div>
    </div>
  )
}

function usePhotoUrls(photos: File[]) {
  const urls = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos])
  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls])
  return urls
}
