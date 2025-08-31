import React from 'react';
import { HeroSection } from '@/components/features/hero-section';
import { FeaturesSection } from '@/components/features/features-section';
import { HowItWorksSection } from '@/components/features/how-it-works-section';
import { UseCasesSection } from '@/components/features/use-cases-section';
import { TechnologySection } from '@/components/features/technology-section';
import { CTASection } from '@/components/features/cta-section';

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <UseCasesSection />
      <TechnologySection />
      <CTASection />
    </div>
  );
}
