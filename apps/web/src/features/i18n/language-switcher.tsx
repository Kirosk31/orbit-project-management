import { useTranslation } from 'react-i18next'
import { CheckIcon, GlobeIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LOCALE_OPTIONS } from '@/features/i18n/locale-options'
import { useLocale } from '@/features/i18n/use-locale'

export function LanguageSwitcher(): React.ReactNode {
  const { t } = useTranslation()
  const { currentLocale, isSaving, changeLocale } = useLocale()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('common.language')}>
          <GlobeIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.code}
            disabled={isSaving}
            onSelect={() => void changeLocale(option.code)}
          >
            <span lang={option.code}>{option.label}</span>
            {option.code === currentLocale && <CheckIcon className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
