"use client"

import type React from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateNeed, type Need } from "@/lib/needs-store"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Loader2, MapPin } from "lucide-react"
import { CategoryCombobox } from "@/components/category-combobox"
import { ImageCaptureInput } from "@/components/image-capture-input"

interface EditNeedDialogProps {
  need: Need
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function EditNeedDialog({ need, isOpen, onClose, onSuccess }: EditNeedDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [title, setTitle] = useState(need.title)
  const [description, setDescription] = useState(need.description || "")
  const [category, setCategory] = useState(need.category)
  const [imagePreviews, setImagePreviews] = useState<string[]>(need.images || [])

  const [cep, setCep] = useState("")
  const [state, setState] = useState(need.state || "")
  const [city, setCity] = useState(need.city || "")
  const [neighborhood, setNeighborhood] = useState(need.neighborhood || "")
  const [latitude, setLatitude] = useState<number | undefined>(need.latitude)
  const [longitude, setLongitude] = useState<number | undefined>(need.longitude)
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)

  const [citySuggestions, setCitySuggestions] = useState<Array<{ id: number; name: string; state: string }>>([])
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [citySearchTimeout, setCitySearchTimeout] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle(need.title)
      setDescription(need.description || "")
      setCategory(need.category)
      setImagePreviews(need.images || [])
      setState(need.state || "")
      setCity(need.city || "")
      setNeighborhood(need.neighborhood || "")
      setLatitude(need.latitude)
      setLongitude(need.longitude)
      setCep("")
    }
  }, [isOpen, need])

  const handleImageCapture = (files: FileList) => {
    const newPreviews: string[] = []
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        if (newPreviews.length === files.length) {
          setImagePreviews((prev) => [...prev, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const searchCities = async (query: string) => {
    if (query.length < 2 || !state) {
      setCitySuggestions([])
      return
    }

    try {
      const response = await fetch(`/api/cities?state=${state}&q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data && Array.isArray(data)) {
        setCitySuggestions(data)
      }
    } catch (error) {
      console.error("City search error:", error)
      setCitySuggestions([])
    }
  }

  const handleCityChange = (value: string) => {
    setCity(value)
    setShowCitySuggestions(true)

    if (citySearchTimeout) {
      clearTimeout(citySearchTimeout)
    }

    const timeout = setTimeout(() => {
      searchCities(value)
    }, 400)

    setCitySearchTimeout(timeout)
  }

  const handleCitySelect = async (suggestion: { id: number; name: string; state: string }) => {
    setCity(suggestion.name)
    setShowCitySuggestions(false)
    setCitySuggestions([])

    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(suggestion.name + ", " + suggestion.state + ", Brasil")}`,
      )
      const data = await response.json()

      if (data && data.length > 0) {
        setLatitude(Number.parseFloat(data[0].lat))
        setLongitude(Number.parseFloat(data[0].lon))
      }
    } catch (error) {
      console.error("Geocoding error:", error)
    }
  }

  const handleCepSearch = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, "")

    if (cleanCep.length !== 8) {
      return
    }

    setIsLoadingCep(true)

    try {
      const response = await fetch(`/api/cep?cep=${cleanCep}`)
      const data = await response.json()

      if (response.ok && data.city) {
        setCity(data.city)
        setState(data.state)
        setNeighborhood(data.neighborhood || "")

        const coordsResponse = await fetch(
          `/api/geocode?q=${encodeURIComponent(`${data.neighborhood ? data.neighborhood + ", " : ""}${data.city}, ${data.state}, Brasil`)}`,
        )
        const coordsData = await coordsResponse.json()

        if (coordsData && coordsData.length > 0) {
          setLatitude(Number.parseFloat(coordsData[0].lat))
          setLongitude(Number.parseFloat(coordsData[0].lon))
        }

        toast({
          title: "CEP encontrado!",
          description: `${data.neighborhood ? data.neighborhood + ", " : ""}${data.city} - ${data.state}`,
          variant: "success",
        })
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP e tente novamente.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("CEP search error:", error)
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível consultar o CEP. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingCep(false)
    }
  }

  const handleCepChange = (value: string) => {
    const formatted = value.replace(/\D/g, "").slice(0, 8)
    setCep(formatted)

    if (formatted.length === 8) {
      handleCepSearch(formatted)
    }
  }

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocalização não disponível",
        description: "Seu navegador não suporta geolocalização.",
        variant: "destructive",
      })
      return
    }

    setIsLoadingLocation(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords

        setLatitude(lat)
        setLongitude(lon)

        try {
          const response = await fetch(`/api/geocode?q=${lat},${lon}&reverse=true`)
          const data = await response.json()

          if (data.address) {
            const stateNameToAbbr: Record<string, string> = {
              Acre: "AC",
              Alagoas: "AL",
              Amapá: "AP",
              Amazonas: "AM",
              Bahia: "BA",
              Ceará: "CE",
              "Distrito Federal": "DF",
              "Espírito Santo": "ES",
              Goiás: "GO",
              Maranhão: "MA",
              "Mato Grosso": "MT",
              "Mato Grosso do Sul": "MS",
              "Minas Gerais": "MG",
              Pará: "PA",
              Paraíba: "PB",
              Paraná: "PR",
              Pernambuco: "PE",
              Piauí: "PI",
              "Rio de Janeiro": "RJ",
              "Rio Grande do Norte": "RN",
              "Rio Grande do Sul": "RS",
              Rondônia: "RO",
              Roraima: "RR",
              "Santa Catarina": "SC",
              "São Paulo": "SP",
              Sergipe: "SE",
              Tocantins: "TO",
            }

            const nhood = data.address.suburb || data.address.neighbourhood || data.address.district || ""
            const cty = data.address.city || data.address.town || data.address.village || ""
            const stateName = data.address.state || ""
            const stateAbbr = stateNameToAbbr[stateName] || stateName

            setNeighborhood(nhood)
            setCity(cty)
            setState(stateAbbr)

            toast({
              title: "Localização obtida!",
              description: `${nhood ? nhood + ", " : ""}${cty} - ${stateAbbr}`,
              variant: "success",
            })
          }
        } catch (error) {
          console.error("Geocoding error:", error)
          toast({
            title: "Erro ao obter localização",
            description: "Não foi possível obter o endereço. Tente preencher manualmente.",
            variant: "destructive",
          })
        } finally {
          setIsLoadingLocation(false)
        }
      },
      (error) => {
        console.error("Geolocation error:", error)
        setIsLoadingLocation(false)
        toast({
          title: "Erro de geolocalização",
          description: "Não foi possível acessar sua localização. Verifique as permissões do navegador.",
          variant: "destructive",
        })
      },
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !category || !city || !state) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha Título, Categoria, Cidade e Estado.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      await updateNeed({
        needId: need.id,
        requesterEmail: need.requesterEmail,
        title,
        description: description || undefined,
        category,
        images: imagePreviews.length > 0 ? imagePreviews : undefined,
        city,
        state,
        neighborhood: neighborhood || undefined,
        latitude,
        longitude,
      })

      toast({
        title: "Sucesso!",
        description: "Seu pedido foi atualizado com sucesso.",
        variant: "success",
      })

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Failed to update need:", error)
      toast({
        title: "Erro ao atualizar pedido",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao tentar atualizar seu pedido.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Solicitação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título do serviço *</Label>
            <Input
              id="edit-title"
              placeholder="Ex: Consertar vazamento na pia"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Detalhes (opcional)</Label>
            <Textarea
              id="edit-description"
              placeholder="Descreva o que precisa ser feito..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Categoria *</Label>
              <CategoryCombobox value={category} onValueChange={setCategory} placeholder="Escolha uma categoria" />
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Localização</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseMyLocation}
                disabled={isLoadingLocation}
                className="gap-2 bg-transparent"
              >
                {isLoadingLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Obtendo...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    Usar minha localização
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cep">CEP (opcional)</Label>
              <div className="relative">
                <Input
                  id="edit-cep"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  maxLength={8}
                />
                {isLoadingCep && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-state">Estado *</Label>
              <Select value={state} onValueChange={setState} required>
                <SelectTrigger id="edit-state">
                  <SelectValue placeholder="Escolha o estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AC">Acre</SelectItem>
                  <SelectItem value="AL">Alagoas</SelectItem>
                  <SelectItem value="AP">Amapá</SelectItem>
                  <SelectItem value="AM">Amazonas</SelectItem>
                  <SelectItem value="BA">Bahia</SelectItem>
                  <SelectItem value="CE">Ceará</SelectItem>
                  <SelectItem value="DF">Distrito Federal</SelectItem>
                  <SelectItem value="ES">Espírito Santo</SelectItem>
                  <SelectItem value="GO">Goiás</SelectItem>
                  <SelectItem value="MA">Maranhão</SelectItem>
                  <SelectItem value="MT">Mato Grosso</SelectItem>
                  <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                  <SelectItem value="MG">Minas Gerais</SelectItem>
                  <SelectItem value="PA">Pará</SelectItem>
                  <SelectItem value="PB">Paraíba</SelectItem>
                  <SelectItem value="PR">Paraná</SelectItem>
                  <SelectItem value="PE">Pernambuco</SelectItem>
                  <SelectItem value="PI">Piauí</SelectItem>
                  <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                  <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                  <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                  <SelectItem value="RO">Rondônia</SelectItem>
                  <SelectItem value="RR">Roraima</SelectItem>
                  <SelectItem value="SC">Santa Catarina</SelectItem>
                  <SelectItem value="SP">São Paulo</SelectItem>
                  <SelectItem value="SE">Sergipe</SelectItem>
                  <SelectItem value="TO">Tocantins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label htmlFor="edit-city">Cidade *</Label>
                <Input
                  id="edit-city"
                  placeholder="Ex: Santa Maria"
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  onFocus={() => setShowCitySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                  required
                  disabled={!state}
                />
                {showCitySuggestions && citySuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {citySuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                        onMouseDown={() => handleCitySelect(suggestion)}
                      >
                        {suggestion.name} - {suggestion.state}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-neighborhood">Bairro (opcional)</Label>
                <Input
                  id="edit-neighborhood"
                  placeholder="Ex: Centro"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  disabled={!city}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-images">Fotos do serviço (opcional)</Label>
            <ImageCaptureInput onCapture={handleImageCapture} multiple={true} disabled={isSubmitting} />
            {imagePreviews.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {imagePreviews.map((src, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={src || "/placeholder.svg"}
                      alt={`Imagem ${index + 1}`}
                      className="w-full h-20 object-cover rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-transparent"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
