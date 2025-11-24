"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addNeed, type NewNeedInput } from "@/lib/needs-store"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { MapPin, Loader2 } from 'lucide-react'
import { CategoryCombobox } from "@/components/category-combobox"

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

export default function RequestForm() {
  const { email } = useAuth()
  const { toast } = useToast()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [city, setCity] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [state, setState] = useState("")
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [latitude, setLatitude] = useState<number | undefined>()
  const [longitude, setLongitude] = useState<number | undefined>()

  const [citySuggestions, setCitySuggestions] = useState<Array<{ id: number; name: string; state: string }>>([])
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [citySearchTimeout, setCitySearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const [neighborhoodSuggestions, setNeighborhoodSuggestions] = useState<
    Array<{ name: string; lat: number; lon: number; displayName: string }>
  >([])
  const [showNeighborhoodSuggestions, setShowNeighborhoodSuggestions] = useState(false)
  const [neighborhoodSearchTimeout, setNeighborhoodSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  const [cep, setCep] = useState("")
  const [isLoadingCep, setIsLoadingCep] = useState(false)

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
        const { latitude, longitude } = position.coords

        setLatitude(latitude)
        setLongitude(longitude)

        try {
          const response = await fetch(`/api/geocode?q=${latitude},${longitude}&reverse=true`)
          const data = await response.json()

          if (data.address) {
            const neighborhood = data.address.suburb || data.address.neighbourhood || data.address.district || ""
            const city = data.address.city || data.address.town || data.address.village || ""
            const stateName = data.address.state || ""
            const stateAbbr = stateNameToAbbr[stateName] || stateName

            setNeighborhood(neighborhood)
            setCity(city)
            setState(stateAbbr)

            toast({
              title: "Localização obtida!",
              description: `${neighborhood ? neighborhood + ", " : ""}${city} - ${stateAbbr}`,
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

  const geocodeAddress = async (
    city: string,
    neighborhood: string,
    state: string,
  ): Promise<{ lat: number; lon: number } | null> => {
    if (!city || !state) {
      return null
    }

    try {
      if (neighborhood) {
        const searchQueryWithNeighborhood = `${neighborhood}, ${city}, ${state}, Brasil`
        console.log("[v0] Tentando geocoding com bairro:", searchQueryWithNeighborhood)

        const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQueryWithNeighborhood)}`)
        const data = await response.json()

        if (data && data.length > 0) {
          console.log("[v0] ✅ Coordenadas encontradas com bairro")
          return {
            lat: Number.parseFloat(data[0].lat),
            lon: Number.parseFloat(data[0].lon),
          }
        }

        console.log("[v0] ⚠️ Bairro não encontrado, tentando apenas com cidade...")
      }

      // Fallback: tentar apenas com cidade
      const searchQueryCity = `${city}, ${state}, Brasil`
      console.log("[v0] Tentando geocoding com cidade:", searchQueryCity)

      const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQueryCity)}`)
      const data = await response.json()

      if (data && data.length > 0) {
        console.log("[v0] ✅ Coordenadas encontradas usando cidade")
        return {
          lat: Number.parseFloat(data[0].lat),
          lon: Number.parseFloat(data[0].lon),
        }
      }

      console.log("[v0] ❌ Não foi possível encontrar coordenadas")
      return null
    } catch (error) {
      console.error("[v0] Geocoding error:", error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para solicitar um serviço.",
        variant: "destructive",
      })
      return
    }

    if (!title || !category || !city || !state || imagePreviews.length === 0) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha Título, Categoria, Cidade, Estado e adicione pelo menos uma foto.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      let finalLatitude = latitude
      let finalLongitude = longitude

      if (!finalLatitude || !finalLongitude) {
        console.log("[v0] Coordenadas não disponíveis, tentando geocodificar...")
        const coords = await geocodeAddress(city, neighborhood, state)
        if (coords) {
          finalLatitude = coords.lat
          finalLongitude = coords.lon
          console.log("[v0] ✅ Coordenadas obtidas via geocoding:", coords)
        } else {
          console.log("[v0] ⚠️ Não foi possível obter coordenadas para este endereço")
          toast({
            title: "Aviso",
            description:
              "Não foi possível determinar a localização exata. O serviço será criado, mas pode não aparecer nas buscas por proximidade.",
            variant: "default",
          })
        }
      } else {
        console.log("[v0] ✅ Usando coordenadas já disponíveis:", { lat: finalLatitude, lon: finalLongitude })
      }

      const newNeed: NewNeedInput = {
        title,
        description: description || undefined,
        category,
        city,
        neighborhood: neighborhood || undefined,
        state,
        latitude: finalLatitude,
        longitude: finalLongitude,
        requesterEmail: email,
        images: imagePreviews.length > 0 ? imagePreviews : undefined,
      }

      await addNeed(newNeed)

      toast({
        title: "Sucesso!",
        description: "Seu pedido foi adicionado com sucesso.",
        variant: "success",
      })

      setTitle("")
      setDescription("")
      setCategory("")
      setCity("")
      setNeighborhood("")
      setState("")
      setImagePreviews([])
      setLatitude(undefined)
      setLongitude(undefined)
      setCep("")
    } catch (error) {
      console.error("Failed to add need:", error)
      toast({
        title: "Erro ao adicionar pedido",
        description: "Ocorreu um erro ao tentar adicionar seu pedido. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

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

  const handleRemoveImage = (indexToRemove: number) => {
    setImagePreviews((prev) => prev.filter((_, index) => index !== indexToRemove))
  }

  const searchNeighborhoods = async (query: string) => {
    if (query.length < 2 || !city || !state) {
      console.log("[v0] Neighborhood search skipped:", { queryLength: query.length, city, state })
      setNeighborhoodSuggestions([])
      return
    }

    console.log("[v0] Searching neighborhoods:", { query, city, state })

    try {
      const url = `/api/neighborhoods?city=${encodeURIComponent(city)}&state=${state}&q=${encodeURIComponent(query)}`
      console.log("[v0] Fetching:", url)

      const response = await fetch(url)
      const data = await response.json()

      console.log("[v0] Neighborhood results:", data)

      if (data && Array.isArray(data)) {
        setNeighborhoodSuggestions(data)
      }
    } catch (error) {
      console.error("[v0] Neighborhood search error:", error)
      setNeighborhoodSuggestions([])
    }
  }

  const handleNeighborhoodChange = (value: string) => {
    console.log("[v0] Neighborhood changed:", value)
    setNeighborhood(value)
    setShowNeighborhoodSuggestions(true)

    if (neighborhoodSearchTimeout) {
      clearTimeout(neighborhoodSearchTimeout)
    }

    const timeout = setTimeout(() => {
      searchNeighborhoods(value)
    }, 400)

    setNeighborhoodSearchTimeout(timeout)
  }

  const handleNeighborhoodSelect = (suggestion: {
    name: string
    lat: number
    lon: number
    displayName: string
  }) => {
    setNeighborhood(suggestion.name)
    setShowNeighborhoodSuggestions(false)
    setNeighborhoodSuggestions([])
    setLatitude(suggestion.lat)
    setLongitude(suggestion.lon)
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

        const coords = await geocodeAddress(data.city, data.neighborhood, data.state)
        if (coords) {
          setLatitude(coords.lat)
          setLongitude(coords.lon)
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

  return (
    <div className="space-y-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">O que você precisa?</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="grid gap-4 sm:gap-6">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm sm:text-base">
                Um título para o serviço
              </Label>
              <Input
                id="title"
                placeholder="Ex: Consertar vazamento na pia"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-sm sm:text-base"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm sm:text-base">
                Detalhes (opcional)
              </Label>
              <Textarea
                id="description"
                placeholder="Descreva o que precisa ser feito..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm sm:text-base resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category" className="text-sm sm:text-base">
                  Qual a categoria?
                </Label>
                <CategoryCombobox
                  value={category}
                  onValueChange={setCategory}
                  placeholder="Escolha uma categoria"
                  className="text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm sm:text-base font-semibold">Localização</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseMyLocation}
                  disabled={isLoadingLocation}
                  className="gap-2 shrink-0 bg-transparent"
                >
                  {isLoadingLocation ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Obtendo...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      <span className="hidden sm:inline">Usar minha localização</span>
                      <span className="sm:hidden">Usar localização</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cep" className="text-sm sm:text-base">
                  CEP (opcional)
                </Label>
                <div className="relative">
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    maxLength={8}
                    className="text-sm sm:text-base"
                  />
                  {isLoadingCep && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite o CEP para preencher automaticamente cidade e bairro
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="state" className="text-sm sm:text-base">
                  Estado *
                </Label>
                <Select value={state} onValueChange={setState} required>
                  <SelectTrigger id="state" className="text-sm sm:text-base">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2 relative">
                  <Label htmlFor="city" className="text-sm sm:text-base">
                    Cidade *
                  </Label>
                  <Input
                    id="city"
                    placeholder="Ex: Santa Maria"
                    value={city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    onFocus={() => setShowCitySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCitySuggestions(false), 200)}
                    required
                    disabled={!state}
                    className="text-sm sm:text-base"
                  />
                  {!state && <p className="text-xs text-muted-foreground">Selecione o estado primeiro</p>}
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

                <div className="grid gap-2 relative">
                  <Label htmlFor="neighborhood" className="text-sm sm:text-base">
                    Bairro (opcional)
                  </Label>
                  <Input
                    id="neighborhood"
                    placeholder="Ex: Centro"
                    value={neighborhood}
                    onChange={(e) => handleNeighborhoodChange(e.target.value)}
                    onFocus={() => setShowNeighborhoodSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowNeighborhoodSuggestions(false), 200)}
                    disabled={!city}
                    className="text-sm sm:text-base"
                  />
                  {!city && <p className="text-xs text-muted-foreground">Selecione a cidade primeiro</p>}
                  {showNeighborhoodSuggestions && neighborhoodSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {neighborhoodSuggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.name}-${index}`}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                          onMouseDown={() => handleNeighborhoodSelect(suggestion)}
                        >
                          {suggestion.displayName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="images" className="text-sm sm:text-base">
                Fotos do serviço *
              </Label>
              <Input
                id="images"
                type="file"
                multiple
                onChange={handleImageUpload}
                accept="image/*"
                className="text-sm sm:text-base"
                required
              />
              <p className="text-xs text-muted-foreground">
                Adicione pelo menos uma foto do serviço (obrigatório).
              </p>
              {imagePreviews.length > 0 && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {imagePreviews.map((src, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={src || "/placeholder.svg"}
                        alt={`Pré-visualização ${index + 1}`}
                        className="w-full h-16 sm:h-20 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        aria-label="Remover imagem"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-600/90 h-10 sm:h-12 text-sm sm:text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Pedir Serviço"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
