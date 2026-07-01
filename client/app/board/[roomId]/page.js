'use client';

import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CanvasBoard from '@/components/CanvasBoard';

export default function BoardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [name, setName] = useState(null);

  useEffect(() => {
    const fromQuery = searchParams.get('name');
    const fromStorage =
      typeof window !== 'undefined' ? localStorage.getItem('syncboard-name') : null;
    setName(fromQuery || fromStorage || 'Guest');
  }, [searchParams]);

  if (!name) return null;

  return (
    <CanvasBoard
      roomId={String(params.roomId).toUpperCase()}
      name={name}
      onLeave={() => router.push('/')}
    />
  );
}
