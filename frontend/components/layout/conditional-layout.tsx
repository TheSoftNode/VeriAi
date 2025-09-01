'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Header } from './header';
import { Footer } from './footer';
import { WalletConnectionPage } from './wallet-connection-page';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const isDashboard = pathname.startsWith('/dashboard');

  if (isDashboard && !isConnected) {
    // Dashboard without wallet - show wallet connection page with header/footer
    return (
      <div className="relative flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <WalletConnectionPage />
        </main>
        <Footer />
      </div>
    );
  }

  if (isDashboard) {
    // Dashboard with wallet - no header/footer, children contain the dashboard layout
    return <>{children}</>;
  }

  // Landing page layout - with header and footer
  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}