'use client';

import { useParams } from 'next/navigation';
import { DocsPage } from '@/components/docs/docs-page';

export default function DocsSlugPage() {
  const params = useParams<{ slug?: string[] }>();
  const path = params.slug?.join('/') || 'index';
  return <DocsPage initialPath={path} />;
}
