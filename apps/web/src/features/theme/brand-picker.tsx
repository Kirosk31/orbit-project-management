import { CheckIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { BRAND_PRESETS, DEFAULT_BRAND_HUE, useBrandStore } from '@/features/theme/brand-store'

/** White-label preview: retunes the whole interface from one hue, live. */
export function BrandPicker(): ReactNode {
  const { t } = useTranslation()
  const hue = useBrandStore((state) => state.hue)
  const setHue = useBrandStore((state) => state.setHue)
  const reset = useBrandStore((state) => state.reset)

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={t('app.brandTitle')} className="flex flex-wrap gap-2">
        {BRAND_PRESETS.map((preset) => {
          const selected = preset.hue === hue
          return (
            <button
              key={preset.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setHue(preset.hue)}
              className="inline-flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-primary"
            >
              <span
                className="flex size-4 items-center justify-center rounded-[3px] text-white"
                style={{ backgroundColor: `oklch(0.45 0.17 ${preset.hue})` }}
                aria-hidden="true"
              >
                {selected && <CheckIcon className="size-3" />}
              </span>
              {t(`app.${preset.key}`)}
            </button>
          )
        })}
      </div>
      {hue !== DEFAULT_BRAND_HUE && (
        <Button type="button" variant="link" size="sm" className="self-start px-0" onClick={reset}>
          {t('app.brandReset')}
        </Button>
      )}
    </div>
  )
}
