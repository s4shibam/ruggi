import { createFileRoute } from '@tanstack/react-router'
import { Info, LogOut, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { UserAvatar } from '@/components/user-avatar'
import { STYLE_PREFERENCE_PRESETS } from '@/constants/profile'
import { useDeleteUserAccount, useGetUserProfile, useUpdateUserProfile } from '@/hooks/api/user'
import { useAuth } from '@/providers/auth-provider'

const ProfilePage = () => {
  const { logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedPreferencePreset, setSelectedPreferencePreset] = useState('')

  const { data: profileData, isLoading, error } = useGetUserProfile(undefined)
  const updateMutation = useUpdateUserProfile()
  const deleteMutation = useDeleteUserAccount()

  const profile = profileData?.data
  const personalization = profile?.personalization

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    personalization: {
      style_preferences: personalization?.style_preferences || null,
      occupation: personalization?.occupation || null,
      nick_name: personalization?.nick_name || null
    }
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        personalization: {
          style_preferences: personalization?.style_preferences || null,
          occupation: personalization?.occupation || null,
          nick_name: personalization?.nick_name || null
        }
      })
      const matchedPreset = STYLE_PREFERENCE_PRESETS.find(
        (preset) => preset.value === personalization?.style_preferences
      )
      setSelectedPreferencePreset(matchedPreset?.value ?? '')
    } else {
      setSelectedPreferencePreset('')
    }
  }, [profile, personalization])

  const handleSave = async () => {
    if (!profile) return

    try {
      await updateMutation.mutateAsync({
        full_name: formData.full_name,
        personalization: formData.personalization
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        personalization: {
          style_preferences: personalization?.style_preferences || null,
          occupation: personalization?.occupation || null,
          nick_name: personalization?.nick_name || null
        }
      })
      const matchedPreset = STYLE_PREFERENCE_PRESETS.find(
        (preset) => preset.value === personalization?.style_preferences
      )
      setSelectedPreferencePreset(matchedPreset?.value ?? '')
    } else {
      setSelectedPreferencePreset('')
    }
    setIsEditing(false)
  }

  const handleDeleteAccount = async () => {
    try {
      await deleteMutation.mutateAsync(undefined)
      await logout()
    } catch (error) {
      console.error('Failed to delete account:', error)
    }
  }

  return (
    <div className="flex h-full flex-1 justify-center overflow-y-auto">
      <div className="flex w-full max-w-4xl flex-1 flex-col gap-6 p-2 sm:p-4">
        <div className="space-y-1">
          <h2 className="font-bold text-xl sm:text-2xl">Profile Settings</h2>
          <p className="text-muted-foreground text-xs sm:text-sm">Manage your account details and personalization.</p>
        </div>

        {isLoading && <ProfileSkeleton />}

        {!isLoading && (error || !profile) && <ProfileErrorMessage errorMessage={error?.message} />}

        {!isLoading && profile && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex-col gap-2 border-b sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Manage your account details.</CardDescription>
                </div>
                {!isEditing && (
                  <CardAction>
                    <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full sm:w-auto">
                      Edit Profile
                    </Button>
                  </CardAction>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <UserAvatar user={profile} size="lg" className="ring-2 ring-primary/10" />
                  <div>
                    <p className="truncate font-semibold text-lg">{profile.full_name || 'User'}</p>
                    <p className="text-muted-foreground text-sm">{profile.email}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={!isEditing}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1">
                      <Label htmlFor="email">Email Address</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64">Email cannot be changed.</TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="relative mt-2">
                      <Mail className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                      <Input id="email" type="email" value={profile.email} disabled className="pl-10" />
                    </div>
                  </div>
                </div>
              </CardContent>

              {isEditing && (
                <CardFooter className="flex-col gap-3 border-t pt-6 sm:flex-row">
                  <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full sm:w-auto">
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={updateMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </CardFooter>
              )}
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>Personalization</CardTitle>
                <CardDescription>Customize your chat experience.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-1">
                    <Label htmlFor="nick_name">Nickname</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        The assistant will use this name when addressing you in conversations.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="nick_name"
                    type="text"
                    value={formData.personalization.nick_name || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalization: { ...formData.personalization, nick_name: e.target.value || null }
                      })
                    }
                    disabled={!isEditing}
                    placeholder="e.g., Sam, Alex"
                    className="mt-2"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1">
                    <Label htmlFor="occupation">Occupation</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-72">
                        Helps the assistant tailor responses to your professional context and expertise level.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="occupation"
                    type="text"
                    value={formData.personalization.occupation || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        personalization: { ...formData.personalization, occupation: e.target.value || null }
                      })
                    }
                    disabled={!isEditing}
                    placeholder="e.g., developer, manager, student"
                    className="mt-2"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-4">
                      <Label htmlFor="style_preferences">Preferences</Label>
                      <p className="text-muted-foreground text-xs">
                        Tell the assistant about tone, formatting, and what to prioritize.
                      </p>
                    </div>
                    <Select
                      disabled={!isEditing}
                      value={selectedPreferencePreset || undefined}
                      onValueChange={(value) => {
                        setSelectedPreferencePreset(value)
                        setFormData({
                          ...formData,
                          personalization: { ...formData.personalization, style_preferences: value }
                        })
                      }}
                    >
                      <SelectTrigger className="sm:w-48">
                        <SelectValue placeholder="Load a preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {STYLE_PREFERENCE_PRESETS.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value} className="cursor-pointer">
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    id="style_preferences"
                    value={formData.personalization.style_preferences || ''}
                    onChange={(e) => {
                      setSelectedPreferencePreset('')
                      setFormData({
                        ...formData,
                        personalization: {
                          ...formData.personalization,
                          style_preferences: e.target.value || null
                        }
                      })
                    }}
                    disabled={!isEditing}
                    placeholder="Describe how you want responses formatted, tone, level of detail, etc."
                    className="mt-1 min-h-28"
                  />
                </div>

                {updateMutation.isError && (
                  <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                    {updateMutation.error?.message || 'Failed to update profile'}
                  </div>
                )}
              </CardContent>

              {isEditing && (
                <CardFooter className="flex-col gap-3 border-t pt-6 sm:flex-row">
                  <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full sm:w-auto">
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={updateMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </CardFooter>
              )}
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle>Account Actions</CardTitle>
                <CardDescription>Manage your sessions or remove your account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 rounded-lg border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Sign Out</p>
                    <p className="text-muted-foreground text-sm">Sign out of your account on this device</p>
                  </div>
                  <Button onClick={logout} variant="outline">
                    <LogOut className="size-4" />
                    Sign Out
                  </Button>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-destructive">Delete Account</p>
                    <p className="text-muted-foreground text-sm">Permanently delete your account and all data</p>
                  </div>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Account Deletion</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to delete your account? This action cannot be undone and all your data will be
            permanently deleted.
          </DialogDescription>
          <DialogFooter>
            <Button onClick={() => setShowDeleteConfirm(false)} variant="outline" disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleDeleteAccount} variant="destructive" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const Route = createFileRoute('/lab/profile')({
  component: ProfilePage
})

const ProfileSkeleton = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-full sm:w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Skeleton className="size-16 rounded-full sm:size-20" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-10 w-full sm:w-48" />
            </div>
            <Skeleton className="h-28 w-full" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="mt-2 h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-full sm:w-32" />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-10 w-full sm:w-36" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const ProfileErrorMessage = ({ errorMessage }: { errorMessage?: string }) => (
  <Card className="w-full">
    <CardContent className="px-4 py-4 text-center sm:px-6 sm:py-8">
      <p className="text-muted-foreground">{errorMessage || 'Failed to load profile. Please try again.'}</p>
    </CardContent>
  </Card>
)
