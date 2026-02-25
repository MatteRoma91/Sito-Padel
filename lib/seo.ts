import type { Metadata } from 'next';

/** Base URL del sito. Usa VERCEL_URL in prod, NEXT_PUBLIC_SITE_URL se impostato, altrimenti localhost. */
export function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
  if (url) {
    return url.startsWith('http') ? url : `https://${url}`;
  }
  return process.env.NODE_ENV === 'production' ? 'https://example.com' : 'http://localhost:3000';
}

export const SITE_NAME = 'Banana Padel Tour';
export const DEFAULT_DESCRIPTION = 'Gestione tornei di padel - Classifiche, calendario, statistiche e risultati. Sito privato per membri.';

export interface SeoOptions {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  tourName?: string;
}

/** Costruisce metadata completi con Open Graph e Twitter. */
export function buildMetadata(options: SeoOptions): Metadata {
  const baseUrl = getBaseUrl();
  const url = options.path ? `${baseUrl}${options.path}` : baseUrl;
  const suffix = options.tourName || SITE_NAME;
  const title = options.title === suffix ? options.title : `${options.title} | ${suffix}`;
  const description = options.description || DEFAULT_DESCRIPTION;
  const ogImage = options.image
    ? (options.image.startsWith('http') ? options.image : `${baseUrl}${options.image}`)
    : `${baseUrl}/logo.png`;

  const metadata: Metadata = {
    title,
    description,
    metadataBase: new URL(baseUrl),
    openGraph: {
      type: 'website',
      locale: 'it_IT',
      url,
      siteName: options.tourName || SITE_NAME,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 512,
          height: 512,
          alt: options.tourName || SITE_NAME,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [ogImage],
    },
    robots: options.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };

  return metadata;
}
