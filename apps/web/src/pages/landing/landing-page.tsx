import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'

import { Footer } from '@/components/marketing/footer'
import { Navbar } from '@/components/marketing/navbar'
import { HeroSection } from '@/pages/landing/sections/hero'
import { FeaturesSection } from '@/pages/landing/sections/features'
import { HowItWorksSection } from '@/pages/landing/sections/how-it-works'
import { FaqSection } from '@/pages/landing/sections/faq'
import { CtaSection } from '@/pages/landing/sections/cta'

export function LandingPage(): ReactNode {
  const location = useLocation()

  // Deep links like /#features scroll to the section on arrival.
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.hash])

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}
