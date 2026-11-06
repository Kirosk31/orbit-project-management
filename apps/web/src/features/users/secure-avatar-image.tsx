import { useQuery } from '@tanstack/react-query'
import type { ComponentProps, ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { AvatarImage } from '@/components/ui/avatar'
import { getAvatarRequest } from '@/features/users/user-api'

export interface SecureAvatarImageProps extends Omit<ComponentProps<typeof AvatarImage>, 'src'> {
  avatarKey: string | null
  userId: string
}

/**
 * Avatars need the session cookie, so they load as blobs. The blob is cached
 * per user and avatar version: thirty cards by one person cost one request.
 */
export function SecureAvatarImage({
  avatarKey,
  userId,
  ...props
}: SecureAvatarImageProps): ReactNode {
  const { data: blob } = useQuery({
    queryKey: ['avatar', userId, avatarKey],
    queryFn: ({ signal }) => getAvatarRequest(userId, signal),
    enabled: Boolean(avatarKey),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  })
  const [objectUrl, setObjectUrl] = useState<string>()

  useEffect(() => {
    if (!blob) {
      setObjectUrl(undefined)
      return
    }
    const url = URL.createObjectURL(blob)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  if (!avatarKey || !objectUrl) return null
  return <AvatarImage {...props} src={objectUrl} />
}
