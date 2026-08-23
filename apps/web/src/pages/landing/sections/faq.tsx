import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SectionHeading } from '@/components/marketing/section-heading'
import { RevealItem, RevealStagger } from '@/components/shared/reveal'
import { cn } from '@/lib/utils'

const QUESTIONS = [
  { q: 'faq.q1', a: 'faq.a1' },
  { q: 'faq.q2', a: 'faq.a2' },
  { q: 'faq.q3', a: 'faq.a3' },
  { q: 'faq.q4', a: 'faq.a4' },
  { q: 'faq.q5', a: 'faq.a5' },
] as const

export function FaqSection(): ReactNode {
  const { t } = useTranslation()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading titleKey="faq.heading" />

        <RevealStagger className="mt-12 flex flex-col gap-3">
          {QUESTIONS.map(({ q, a }, index) => {
            const isOpen = openIndex === index
            return (
              <RevealItem key={q}>
                <div className="bg-card rounded-xl border">
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-5 py-4 text-base font-medium"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    {t(q)}
                    <ChevronDownIcon
                      className={cn(
                        'text-muted-foreground size-4 shrink-0 transition-transform duration-200',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </Button>
                  <div
                    className={cn(
                      'grid transition-all duration-200',
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="text-muted-foreground px-5 pb-5 text-sm leading-relaxed">
                        {t(a)}
                      </p>
                    </div>
                  </div>
                </div>
              </RevealItem>
            )
          })}
        </RevealStagger>
      </div>
    </section>
  )
}
