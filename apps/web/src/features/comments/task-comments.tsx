import type { CommentDto, OrganizationMemberDto } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, MessageCircleIcon, PencilIcon, ReplyIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { KeyboardEvent, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import Markdown from 'react-markdown'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/features/auth/auth-store'
import {
  createCommentRequest,
  deleteCommentRequest,
  listCommentsRequest,
  toggleReactionRequest,
  updateCommentRequest,
} from '@/features/comments/comment-api'
import {
  applyMentionCompletion,
  bodyMentionsFullName,
  extractMentionToken,
  highlightMentions,
} from '@/features/comments/mention-utils'
import { SecureAvatarImage } from '@/features/users/secure-avatar-image'
import { formatRelativeTime, initialsOf } from '@/lib/utils'

const REACTION_EMOJIS = ['👍', '❤️', '🔥', '👏', '😄', '🚀']

interface TaskCommentsProps {
  taskId: string
  members: OrganizationMemberDto[]
}

interface CommentComposerProps {
  members: OrganizationMemberDto[]
  placeholder: string
  submitLabel: string
  autoFocus?: boolean
  onSubmit: (body: string, mentionIds: string[]) => void
  pending: boolean
}

function CommentComposer({
  members,
  placeholder,
  submitLabel,
  autoFocus,
  onSubmit,
  pending,
}: CommentComposerProps): ReactNode {
  const { t } = useTranslation()
  const [body, setBody] = useState('')
  const [caret, setCaret] = useState(0)
  const [query, setQuery] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [mentionIds, setMentionIds] = useState<string[]>([])

  const matches = useMemo(() => {
    if (query === null) {
      return []
    }
    const term = query.toLocaleLowerCase()
    return members
      .filter((member) => member.fullName.toLocaleLowerCase().startsWith(term))
      .slice(0, 6)
  }, [members, query])

  const select = (member: OrganizationMemberDto) => {
    const completion = applyMentionCompletion(body, caret, member.fullName)
    setBody(completion.text)
    setCaret(completion.caret)
    setQuery(null)
    setIndex(0)
    setMentionIds((current) =>
      current.includes(member.userId) ? current : [...current, member.userId],
    )
  }

  const handleChange = (value: string, selectionStart: number) => {
    setBody(value)
    setCaret(selectionStart)
    setQuery(extractMentionToken(value, selectionStart))
    setIndex(0)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (query !== null && matches.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setIndex((current) => (current + 1) % matches.length)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setIndex((current) => (current - 1 + matches.length) % matches.length)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        select(matches[index]!)
        return
      }
      if (event.key === 'Escape') {
        setQuery(null)
      }
    }
  }

  const toggleMention = (userId: string) => {
    setMentionIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    )
  }

  const submit = () => {
    const trimmed = body.trim()
    if (!trimmed) {
      return
    }
    const bodyMentionIds = members
      .filter((member) => bodyMentionsFullName(trimmed, member.fullName))
      .map((member) => member.userId)
    const allMentionIds = [...new Set([...mentionIds, ...bodyMentionIds])]
    onSubmit(trimmed, allMentionIds)
    setBody('')
    setCaret(0)
    setQuery(null)
    setIndex(0)
    setMentionIds([])
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={body}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(event) =>
          handleChange(event.currentTarget.value, event.currentTarget.selectionStart)
        }
        onKeyDown={handleKeyDown}
        className="min-h-24"
      />

      {query !== null && matches.length > 0 ? (
        <ul className="border-border flex flex-col gap-0.5 rounded-md border p-1">
          {matches.map((member, memberIndex) => (
            <li key={member.userId}>
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  select(member)
                }}
                className={`flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm ${
                  memberIndex === index ? 'bg-muted' : ''
                }`}
              >
                <Avatar className="size-5">
                  <SecureAvatarImage
                    userId={member.userId}
                    avatarKey={member.avatarKey}
                    alt={member.fullName}
                  />
                  <AvatarFallback className="text-[10px]">
                    {initialsOf(member.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 truncate">{member.fullName}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {body.trim() ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-muted-foreground text-xs">{t('comments.mentionMembers')}</span>
          {members.map((member) => {
            const selected = mentionIds.includes(member.userId)
            return (
              <button
                key={member.userId}
                type="button"
                onClick={() => toggleMention(member.userId)}
                className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                {selected ? <CheckIcon className="mr-0.5 inline size-3" /> : null}@{member.fullName}
              </button>
            )
          })}
        </div>
      ) : null}

      <Button className="self-start" onClick={submit} disabled={!body.trim() || pending}>
        {submitLabel}
      </Button>
    </div>
  )
}

export function TaskComments({ taskId, members }: TaskCommentsProps): ReactNode {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const commentsQuery = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => listCommentsRequest(taskId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] })
  }

  const createMutation = useMutation({
    mutationFn: (input: { body: string; parentId: string | null; mentionIds: string[] }) =>
      createCommentRequest(taskId, input),
    onSuccess: () => {
      invalidate()
      setReplyTo(null)
      toast.success(t('comments.created'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const updateMutation = useMutation({
    mutationFn: (input: { commentId: string; body: string }) =>
      updateCommentRequest(input.commentId, { body: input.body }),
    onSuccess: () => {
      invalidate()
      setEditId(null)
      toast.success(t('comments.updated'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteCommentRequest(commentId),
    onSuccess: () => {
      invalidate()
      setConfirmDeleteId(null)
      toast.success(t('comments.deleted'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const reactionMutation = useMutation({
    mutationFn: (input: { commentId: string; emoji: string }) =>
      toggleReactionRequest(input.commentId, input.emoji),
    onSuccess: () => {
      invalidate()
      toast.success(t('comments.reacted'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const comments = commentsQuery.data?.rows ?? []
  const topLevel = comments.filter((comment) => comment.parentId === null)
  const repliesOf = (commentId: string) =>
    comments.filter((comment) => comment.parentId === commentId)

  const renderComment = (comment: CommentDto) => {
    const isOwn = comment.author.id === currentUserId
    const replies = repliesOf(comment.id)
    const reactions = comment.reactions
    const presentEmojis = new Set(reactions.map((reaction) => reaction.emoji))
    const markdownBody = highlightMentions(
      comment.body,
      comment.mentions.map((mention) => mention.fullName),
    )

    return (
      <li key={comment.id} className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <Avatar className="size-7">
            <SecureAvatarImage
              userId={comment.author.id}
              avatarKey={comment.author.avatarKey}
              alt={comment.author.fullName}
            />
            <AvatarFallback className="text-xs">
              {initialsOf(comment.author.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="font-medium">{comment.author.fullName}</span>
              <span className="text-muted-foreground text-xs">
                {formatRelativeTime(comment.createdAt, i18n.language)}
              </span>
              {comment.isEdited && (
                <Badge variant="outline" className="px-1.5 text-[10px]">
                  {t('comments.edited')}
                </Badge>
              )}
            </div>
            {editId === comment.id ? (
              <div className="mt-1 flex flex-col gap-2">
                <Textarea
                  autoFocus
                  value={editBody}
                  onChange={(event) => setEditBody(event.currentTarget.value)}
                  className="min-h-20"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      editBody.trim() &&
                      updateMutation.mutate({ commentId: comment.id, body: editBody.trim() })
                    }
                    disabled={!editBody.trim() || updateMutation.isPending}
                  >
                    {t('common.save')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditId(null)
                      setEditBody('')
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground break-words text-sm">
                <Markdown>{markdownBody}</Markdown>
              </div>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() =>
                    reactionMutation.mutate({ commentId: comment.id, emoji: reaction.emoji })
                  }
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                    reaction.reactedByMe
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {reaction.emoji} {reaction.count}
                </button>
              ))}
              {presentEmojis.size < REACTION_EMOJIS.length && (
                <div className="flex items-center gap-0.5">
                  {REACTION_EMOJIS.filter((emoji) => !presentEmojis.has(emoji)).map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={emoji}
                      className="text-muted-foreground rounded-full p-1 text-sm opacity-70 transition-opacity hover:bg-muted hover:opacity-100"
                      onClick={() => reactionMutation.mutate({ commentId: comment.id, emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              {isOwn ? (
                <div className="ml-1 flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-7 gap-1 px-1.5 text-xs"
                    onClick={() => {
                      setEditId(comment.id)
                      setEditBody(comment.body)
                    }}
                  >
                    <PencilIcon className="size-3" />
                    {t('comments.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 gap-1 px-1.5 text-xs ${
                      confirmDeleteId === comment.id ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                    onClick={() => {
                      if (confirmDeleteId === comment.id) {
                        deleteMutation.mutate(comment.id)
                      } else {
                        setConfirmDeleteId(comment.id)
                      }
                    }}
                  >
                    <Trash2Icon className="size-3" />
                    {confirmDeleteId === comment.id
                      ? t('comments.confirmDelete')
                      : t('comments.delete')}
                  </Button>
                </div>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-7 gap-1 px-1.5 text-xs"
                onClick={() => {
                  setReplyTo(replyTo === comment.id ? null : comment.id)
                }}
              >
                <ReplyIcon className="size-3" />
                {t('comments.reply')}
              </Button>
            </div>

            {replyTo === comment.id ? (
              <div className="mt-2">
                <CommentComposer
                  members={members}
                  placeholder={t('comments.replyPlaceholder')}
                  submitLabel={t('comments.submit')}
                  autoFocus
                  pending={createMutation.isPending}
                  onSubmit={(body, mentionIds) =>
                    createMutation.mutate({ body, parentId: comment.id, mentionIds })
                  }
                />
              </div>
            ) : null}
          </div>
        </div>

        {replies.length > 0 ? (
          <ul className="flex flex-col gap-3 border-l pl-4">
            {replies.map((reply) => renderComment(reply))}
          </ul>
        ) : null}
      </li>
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircleIcon className="size-4" />
          {t('comments.title')}
          {commentsQuery.data ? ` (${commentsQuery.data.total})` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <CommentComposer
          members={members}
          placeholder={t('comments.placeholder')}
          submitLabel={t('comments.submit')}
          pending={createMutation.isPending}
          onSubmit={(body, mentionIds) =>
            createMutation.mutate({ body, parentId: null, mentionIds })
          }
        />

        {commentsQuery.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-3/4" />
          </div>
        ) : topLevel.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('comments.noComments')}</p>
        ) : (
          <ul className="flex flex-col gap-5">
            {topLevel.map((comment) => renderComment(comment))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
