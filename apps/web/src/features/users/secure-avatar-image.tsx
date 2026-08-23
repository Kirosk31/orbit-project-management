import type { ComponentProps, ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { AvatarImage } from '@/components/ui/avatar'
import { getAvatarRequest } from '@/features/users/user-api'

export interface SecureAvatarImageProps extends Omit<ComponentProps<typeof AvatarImage>, 'src'> {
  avatarKey: string | null
  userId: string
}

export function SecureAvatarImage({
  avatarKey,
  userId,
  ...props
}: SecureAvatarImageProps): ReactNode {
  const [objectUrl, setObjectUrl] = useState<string>()

  useEffect(() => {
    const controller = new AbortController()
    let currentObjectUrl: string | undefined

    if (avatarKey) {
      void getAvatarRequest(userId, controller.signal)
        .then((blob) => {
          if (controller.signal.aborted) return
          currentObjectUrl = URL.createObjectURL(blob)
          setObjectUrl(currentObjectUrl)
        })
        .catch(() => {
          if (!controller.signal.aborted) setObjectUrl(undefined)
        })
    }

    return () => {
      controller.abort()
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
    }
  }, [avatarKey, userId])

  if (!avatarKey || !objectUrl) return null
  return <AvatarImage {...props} src={objectUrl} />
}
