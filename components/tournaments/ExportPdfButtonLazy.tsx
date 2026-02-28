'use client';

import dynamic from 'next/dynamic';

export const ExportPdfButtonLazy = dynamic(
  () => import('./ExportPdfButton').then((m) => ({ default: m.ExportPdfButton })),
  { ssr: false }
);
