import type { AttachmentDto } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DownloadIcon, FileIcon, PaperclipIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SecureAvatarImage } from '@/features/users/secure-avatar-image'
import {
  deleteAttachmentRequest,
  downloadAttachmentRequest,
  listAttachmentsRequest,
  uploadAttachmentRequest,
} from '@/features/tasks/task-api'
import { initialsOf } from '@/lib/utils'

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.pdf,.txt,.md,.csv'

function formatBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`
  if (bytes < 1_048_576) return `${Math.ceil(bytes / 1_024)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function TaskAttachments({ taskId }: { taskId: string }): ReactNode {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File>()
  const [downloadingId, setDownloadingId] = useState<string>()
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string>()
  const queryKey = ['task-attachments', taskId] as const
  const query = useQuery({ queryKey, queryFn: () => listAttachmentsRequest(taskId) })

  const refreshActivity = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] })
  }
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachmentRequest(taskId, file),
    onSuccess: (attachment) => {
      queryClient.setQueryData<AttachmentDto[]>(queryKey, (current = []) => [
        attachment,
        ...current,
      ])
      setSelectedFile(undefined)
      if (inputRef.current) inputRef.current.value = ''
      refreshActivity()
      toast.success(t('tasks.attachmentUploaded'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })
  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => deleteAttachmentRequest(taskId, attachmentId),
    onSuccess: (_result, attachmentId) => {
      queryClient.setQueryData<AttachmentDto[]>(queryKey, (current = []) =>
        current.filter((attachment) => attachment.id !== attachmentId),
      )
      setConfirmingDeleteId(undefined)
      refreshActivity()
      toast.success(t('tasks.attachmentDeleted'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const download = async (attachment: AttachmentDto): Promise<void> => {
    setDownloadingId(attachment.id)
    try {
      saveBlob(await downloadAttachmentRequest(taskId, attachment.id), attachment.originalName)
    } catch {
      toast.error(t('auth.genericError'))
    } finally {
      setDownloadingId(undefined)
    }
  }

  const attachments = query.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PaperclipIcon className="size-4" />
          {t('tasks.attachments')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault()
            if (selectedFile) uploadMutation.mutate(selectedFile)
          }}
        >
          <div className="min-w-0 flex-1">
            <Input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              aria-label={t('tasks.chooseAttachment')}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file && file.size > MAX_ATTACHMENT_BYTES) {
                  event.currentTarget.value = ''
                  setSelectedFile(undefined)
                  toast.error(t('tasks.attachmentTooLarge'))
                  return
                }
                setSelectedFile(file)
              }}
            />
            <p className="text-muted-foreground mt-1 text-xs">{t('tasks.attachmentHelp')}</p>
          </div>
          <Button type="submit" disabled={!selectedFile || uploadMutation.isPending}>
            <UploadIcon />
            {t('tasks.uploadAttachment')}
          </Button>
        </form>

        {query.isPending ? (
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        ) : attachments.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('tasks.noAttachments')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex flex-wrap items-center gap-3 rounded-md border p-3"
              >
                <FileIcon className="text-muted-foreground size-5 shrink-0" />
                <div className="min-w-40 flex-1">
                  <p className="truncate text-sm font-medium" title={attachment.originalName}>
                    {attachment.originalName}
                  </p>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                    <Avatar className="size-5">
                      <SecureAvatarImage
                        userId={attachment.uploaderId}
                        avatarKey={attachment.uploaderAvatarKey}
                        alt={attachment.uploaderName}
                      />
                      <AvatarFallback className="text-[9px]">
                        {initialsOf(attachment.uploaderName)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{attachment.uploaderName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatBytes(attachment.sizeBytes)}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={attachment.createdAt}>
                      {new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: 'medium',
                      }).format(new Date(attachment.createdAt))}
                    </time>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={downloadingId === attachment.id}
                  onClick={() => void download(attachment)}
                >
                  <DownloadIcon />
                  <span className="sr-only">{t('tasks.downloadAttachment')}</span>
                </Button>
                {confirmingDeleteId === attachment.id ? (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(attachment.id)}
                    >
                      {t('common.confirm')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmingDeleteId(undefined)}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setConfirmingDeleteId(attachment.id)}
                  >
                    <Trash2Icon />
                    <span className="sr-only">{t('tasks.deleteAttachment')}</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
