"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addNeed, type NewNeedInput } from "@/lib/needs-store"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { Loader2, MapPin, AlertCircle } from "lucide-react"
import { CategoryCombobox } from "@/components/category-combobox"
import { ImageCaptureInput } from "@/components/image-capture-input"
import { RequestFormAIChat } from "@/components/request-form-ai-chat"

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
  const formRef = useRef<HTMLFormElement>(null)
  const errorBannerRef = useRef<HTMLDivElement>(null)

  // AI Chat mode toggle
  const [useAIChat, setUseAIChat] = useState(false)

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

  // Validation errors state
  const [errors, setErrors] = useState<{
    title?: string
    description?: string
    category?: string
    city?: string
    state?: string
    images?: string
  }>({})

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

        const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQueryWithNeighborhood)}`)
        const data = await response.json()

        if (data && data.length > 0) {
          return {
            lat: Number.parseFloat(data[0].lat),
            lon: Number.parseFloat(data[0].lon),
          }
        }
      }

      // Fallback: tentar apenas com cidade
      const searchQueryCity = `${city}, ${state}, Brasil`

      const response = await fetch(`/api/geocode?q=${encodeURIComponent(searchQueryCity)}`)
      const data = await response.json()

      if (data && data.length > 0) {
        return {
          lat: Number.parseFloat(data[0].lat),
          lon: Number.parseFloat(data[0].lon),
        }
      }

      return null
    } catch (error) {
      console.error("Geocoding error:", error)
      return null
    }
  }

  // Validação de formulário
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    if (!title.trim()) {
      newErrors.title = "Título é obrigatório"
    } else if (title.trim().length < 5) {
      newErrors.title = "Título deve ter pelo menos 5 caracteres"
    } else if (title.trim().length > 100) {
      newErrors.title = "Título deve ter no máximo 100 caracteres"
    }

    if (description && description.trim().length < 10) {
      newErrors.description = "Descrição deve ter pelo menos 10 caracteres"
    } else if (description && description.trim().length > 1000) {
      newErrors.description = "Descrição deve ter no máximo 1000 caracteres"
    }

    if (!category) {
      newErrors.category = "Categoria é obrigatória"
    }

    if (!city) {
      newErrors.city = "Cidade é obrigatória"
    }

    if (!state) {
      newErrors.state = "Estado é obrigatório"
    }

    if (imagePreviews.length === 0) {
      newErrors.images = "Adicione pelo menos uma foto"
    } else if (imagePreviews.length > 10) {
      newErrors.images = "Máximo de 10 fotos permitido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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

    // Validar formulário
    if (!validateForm()) {
      // Scroll para o banner de erro
      if (errorBannerRef.current) {
        errorBannerRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
      }
      return
    }

    setIsSubmitting(true)

    try {
      let finalLatitude = latitude
      let finalLongitude = longitude

      if (!finalLatitude || !finalLongitude) {
        const coords = await geocodeAddress(city, neighborhood, state)
        if (coords) {
          finalLatitude = coords.lat
          finalLongitude = coords.lon
        } else {
          toast({
            title: "Aviso",
            description:
              "Não foi possível determinar a localização exata. O serviço será criado, mas pode não aparecer nas buscas por proximidade.",
            variant: "default",
          })
        }
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
      setErrors({})
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

  const handleImageCapture = (files: FileList | File[]) => {
    const fileArray = Array.isArray(files) ? files : Array.from(files)
    fileArray.forEach((file) => {
      // Criar blob URL em vez de data URL para economizar memória
      const blobUrl = URL.createObjectURL(file)
      setImagePreviews((prev) => [...prev, blobUrl])
    })
  }

  const handleRemoveImage = (indexToRemove: number) => {
    setImagePreviews((prev) => {
      // Revogar blob URL para liberar memória
      const urlToRemove = prev[indexToRemove]
      if (urlToRemove && urlToRemove.startsWith("blob:")) {
        URL.revokeObjectURL(urlToRemove)
      }
      return prev.filter((_, i) => i !== indexToRemove)
    })
  }

  const searchNeighborhoods = async (query: string) => {
    if (query.length < 2 || !city || !state) {
      setNeighborhoodSuggestions([])
      return
    }

    try {
      const url = `/api/neighborhoods?city=${encodeURIComponent(city)}&state=${state}&q=${encodeURIComponent(query)}`

      const response = await fetch(url)
      const data = await response.json()

      if (data && Array.isArray(data)) {
        setNeighborhoodSuggestions(data)
      }
    } catch (error) {
      console.error("Neighborhood search error:", error)
      setNeighborhoodSuggestions([])
    }
  }

  const handleNeighborhoodChange = (value: string) => {
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
          <div className="flex justify-between items-center gap-4">
            <CardTitle className="text-lg sm:text-xl">O que você precisa?</CardTitle>
            <Button
              onClick={() => setUseAIChat(!useAIChat)}
              className={`${
                useAIChat
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              } text-white font-semibold shadow-lg`}
              size="sm"
            >
              {useAIChat ? "← Voltar ao Formulário" : "💬 Solicitar com Chat IA"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* AI Chat Mode */}
          {useAIChat && (
            <RequestFormAIChat
              onExtract={(info) => {
                if (info.title) setTitle(info.title)
                if (info.description) setDescription(info.description)
                if (info.category) setCategory(info.category)
                if (info.city) setCity(info.city)
                if (info.state) setState(info.state)
                if (info.neighborhood) setNeighborhood(info.neighborhood)
              }}
              onComplete={(info) => {
                // Preencher todos os campos do formulário
                if (info.title) setTitle(info.title)
                if (info.description) setDescription(info.description)
                if (info.category) setCategory(info.category)
                if (info.city) setCity(info.city)
                if (info.state) setState(info.state)
                if (info.neighborhood) setNeighborhood(info.neighborhood)
                
                // Adicionar imagens se fornecidas
                if (info.images && info.images.length > 0) {
                  handleImageCapture(info.images)
                }
                
                // Voltar para formulário
                setUseAIChat(false)
                
                // Fazer submit automático após preencher dados
                setTimeout(() => {
                  if (formRef.current) {
                    formRef.current.dispatchEvent(new Event('submit', { bubbles: true }))
                  }
                }, 300)
              }}
            />
          )}

          {/* Traditional Form Mode */}
          {!useAIChat && (
            <>
              {/* Banner de erros de validação */}
              {Object.keys(errors).length > 0 && (
                <div
                  ref={errorBannerRef}
                  className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-sm"
                  role="alert"
                  aria-live="assertive"
                >
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-800 mb-2">Formulário com erros</h3>
                      <ul className="text-sm text-red-700 space-y-1">
                        {Object.entries(errors).map(([field, error]) => (
                          <li key={field} className="flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

          <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 sm:gap-6">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm sm:text-base">
                Um título para o serviço *
              </Label>
              <div className="space-y-1">
                <Input
                  id="title"
                  placeholder="Ex: Consertar vazamento na pia"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    if (errors.title) {
                      setErrors({ ...errors, title: undefined })
                    }
                  }}
                  required
                  className={`text-sm sm:text-base ${errors.title ? "border-red-500" : ""}`}
                  maxLength={100}
                />
                <div className="flex justify-between items-center">
                  <p className={`text-xs ${errors.title ? "text-red-500" : "text-muted-foreground"}`}>
                    {errors.title ? errors.title : `${title.length}/100`}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm sm:text-base">
                Detalhes (opcional)
              </Label>
              <div className="space-y-1">
                <Textarea
                  id="description"
                  placeholder="Descreva o que precisa ser feito..."
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    if (errors.description) {
                      setErrors({ ...errors, description: undefined })
                    }
                  }}
                  className={`text-sm sm:text-base resize-none ${errors.description ? "border-red-500" : ""}`}
                  maxLength={1000}
                />
                <div className="flex justify-between items-center">
                  <p className={`text-xs ${errors.description ? "text-red-500" : "text-muted-foreground"}`}>
                    {errors.description ? errors.description : `${description.length}/1000`}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category" className="text-sm sm:text-base">
                  Qual a categoria? *
                </Label>
                <div className="space-y-1">
                  <CategoryCombobox
                    value={category}
                    onValueChange={(value) => {
                      setCategory(value)
                      if (errors.category) {
                        setErrors({ ...errors, category: undefined })
                      }
                    }}
                    placeholder="Escolha uma categoria"
                    className={`text-sm sm:text-base ${errors.category ? "border-red-500" : ""}`}
                  />
                  {errors.category && (
                    <p className="text-xs text-red-500">{errors.category}</p>
                  )}
                </div>
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
              <div className="space-y-2">
                <ImageCaptureInput onCapture={handleImageCapture} multiple={true} disabled={isSubmitting} />
                <p className={`text-xs ${errors.images ? "text-red-500" : "text-muted-foreground"}`}>
                  {errors.images ? errors.images : "Adicione pelo menos uma foto do serviço (máximo 10)."}
                </p>
                {imagePreviews.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      {imagePreviews.length} foto{imagePreviews.length !== 1 ? "s" : ""} adicionada{imagePreviews.length !== 1 ? "s" : ""}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {imagePreviews.map((src, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={src || "/placeholder.svg"}
                            alt={`Pré-visualização ${index + 1}`}
                            className="w-full h-16 sm:h-20 object-cover rounded-md border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleRemoveImage(index)
                              if (errors.images) {
                                setErrors({ ...errors, images: undefined })
                              }
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            aria-label="Remover imagem"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-600/90 h-10 sm:h-12 text-sm sm:text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Pedir Serviço"}
            </Button>
          </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
