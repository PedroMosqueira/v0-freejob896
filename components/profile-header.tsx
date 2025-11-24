"use client"

import type React from "react"

import type { UserProfile } from "@/lib/user-profile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Camera, CheckCircle, Briefcase, User } from "lucide-react"
import { useState } from "react"
import { uploadProfileImage } from "@/lib/user-profile"
import { useFormState } from "react-dom"

interface ProfileHeaderProps {
  profile: UserProfile
  isPublic?: boolean
}

export function ProfileHeader({ profile, isPublic = false }: ProfileHeaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [state, formAction] = useFormState(uploadProfileImage, null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

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
          <label
            htmlFor="profile-image-upload"
            className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
          >
            <Camera className="h-4 w-4" />
            <input
              id="profile-image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold">{profile.fullName || "Nome não informado"}</h2>
          {profile.verifiedAt && <CheckCircle className="h-5 w-5 text-green-600" />}
        </div>

        <p className="text-muted-foreground mb-3">{profile.email}</p>

        {profile.bio && <p className="text-sm mb-3">{profile.bio}</p>}

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
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {!isPublic && state?.message && (
          <p className={`mt-3 text-sm ${state.success ? "text-green-600" : "text-red-600"}`}>{state.message}</p>
        )}
      </div>
    </div>
  )
}
