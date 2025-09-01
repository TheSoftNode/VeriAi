'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MarketplacePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/marketplace');
  }, [router]);

  return null;
}
