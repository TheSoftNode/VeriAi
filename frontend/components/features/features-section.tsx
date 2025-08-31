'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Zap, Database, CheckCircle, Globe } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Cryptographic Proof',
    description: 'Immutable verification certificates secured by blockchain technology',
    color: 'text-blue-500',
  },
  {
    icon: Zap,
    title: 'Flare Data Connector',
    description: 'Leverages Flare\'s native FDC for decentralized consensus',
    color: 'text-yellow-500',
  },
  {
    icon: Lock,
    title: 'Tamper-Proof',
    description: 'Any modification to verified content is immediately detectable',
    color: 'text-green-500',
  },
  {
    icon: Database,
    title: 'Multi-AI Support',
    description: 'Works with GPT, Gemini, Claude, and other major AI models',
    color: 'text-purple-500',
  },
  {
    icon: CheckCircle,
    title: 'Instant Verification',
    description: 'Real-time validation with automated proof generation',
    color: 'text-emerald-500',
  },
  {
    icon: Globe,
    title: 'Universal Access',
    description: 'Open protocol accessible to developers and enterprises',
    color: 'text-cyan-500',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Why Choose VeriAI?
            </h2>
            <p className="text-lg text-muted-foreground sm:text-xl">
              The first and only solution for cryptographically verifying AI content
              using decentralized blockchain technology.
            </p>
          </motion.div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="group h-full border-2 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
