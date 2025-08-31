'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Shield, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background to-muted/50 py-20 lg:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px] [mask-image:radial-gradient(white,transparent_70%)]" />
      
      <div className="container relative">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Badge */}
            <div className="inline-flex items-center rounded-full border px-4 py-2 text-sm">
              <Zap className="mr-2 h-4 w-4 text-yellow-500" />
              <span className="font-medium">Powered by Flare Data Connector</span>
            </div>

            {/* Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  Verify AI Content
                </span>
                <br />
                <span className="text-foreground">On-Chain</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Get cryptographic proof of AI-generated content authenticity using Flare&apos;s 
                decentralized Data Connector. Transform AI outputs into immutable verification certificates.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/generate">
                <Button size="lg" className="w-full sm:w-auto">
                  <Zap className="mr-2 h-5 w-5" />
                  Generate Content
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/verify">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Shield className="mr-2 h-5 w-5" />
                  Verify Content
                </Button>
              </Link>
            </div>

            {/* Quick Access */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              <Link href="/collection">
                <Button variant="ghost" size="sm">
                  View Collection
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="ghost" size="sm">
                  Analytics
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-1 gap-4 pt-8 sm:grid-cols-3"
            >
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground">Decentralized</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Verification</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-primary">∞</div>
                <div className="text-sm text-muted-foreground">Immutable</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
