"use client"

import type { UserProfile } from "@/lib/user-profile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Camera, CheckCircle, Briefcase, User, Phone } from "lucide-react"
import { useState } from "react"
import { uploadProfileImage } from "@/lib/user-profile"
import { useFormState } from "react-dom"
import { ImageCaptureInput } from "@/components/image-capture-input"

interface ProfileHeaderProps {
  profile: UserProfile
  isPublic?: boolean
}

export function ProfileHeader({ profile, isPublic = false }: ProfileHeaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [state, formAction] = useFormState(uploadProfileImage, null)
  const [showCaptureButtons, setShowCaptureButtons] = useState(false)

  const handleFileCapture = async (files: FileList) => {
    const file = files[0]
    if (!file) return

    setIsUploading(true)
    setShowCaptureButtons(false)
    const formData = new FormData()
    formData.append("file", file)

    console.log("[v0] Starting file upload:", file.name)
    await formAction(formData)
    setIsUploading(false)
  }

  const initials = profile.fullName
    ? profile.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0].toUpperCase()

  return (
    <div className="flex items-start gap-6 p-6 bg-card rounded-lg border">
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage src={state?.imageUrl || profile.profileImageUrl} alt={profile.fullName || profile.email} />
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>
        {!isPublic && (
          <>
            <button
              type="button"
              onClick={() => setShowCaptureButtons(!showCaptureButtons)}
              className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
              disabled={isUploading}
            >
              <Camera className="h-4 w-4" />
            </button>

            {showCaptureButtons && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-2 z-10 bg-background border rounded-lg shadow-lg p-3 w-[90vw] max-w-[320px]">
                <ImageCaptureInput onCapture={handleFileCapture} disabled={isUploading} label="Foto de perfil" />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex-1">
        {state?.message && (
          <div className={`mb-3 p-3 rounded-lg text-sm ${state.success ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"}`}>
            {state.message}
          </div>
        )}
        
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold">{profile.fullName || "Nome não informado"}</h2>
          {profile.verifiedAt && <CheckCircle className="h-5 w-5 text-green-600" />}
        </div>

        <p className="text-muted-foreground mb-3">{profile.email}</p>

        {profile.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Phone className="h-4 w-4" />
            <span>{profile.phone}</span>
          </div>
        )}

        {profile.bio && <p className="text-sm mb-3 text-foreground">{profile.bio}</p>}

        <div className="flex flex-wrap gap-2 mb-3">
          {profile.isClient && (
            <Badge variant="secondary">
              <User className="h-3 w-3 mr-1" />
              Cliente
            </Badge>
          )}
          {profile.isProfessional && (
            <Badge variant="default">
              <Briefcase className="h-3 w-3 mr-1" />
              Profissional
            </Badge>
          )}
          {profile.city && <Badge variant="outline">{profile.city}</Badge>}
          {profile.phoneVerified && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Telefone Verificado
            </Badge>
          )}
        </div>

        {profile.isProfessional && profile.skills && profile.skills.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Especialização</p>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {!isPublic && state?.message && (
          <p className={`mt-3 text-sm ${state.success ? "text-green-600" : "text-red-600"}`}>{state.message}</p>
        )}
      </div>
    </div>
  )
}
