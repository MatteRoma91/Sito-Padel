import { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/profiles/',
          '/tournaments/',
          '/rankings',
          '/calendar',
          '/pairs',
          '/archive',
          '/settings',
          '/regolamento',
          '/stats',
          '/change-password',
          '/api/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/profiles/',
          '/tournaments/',
          '/rankings',
          '/calendar',
          '/pairs',
          '/archive',
          '/settings',
          '/regolamento',
          '/stats',
          '/change-password',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl.replace(/^https?:\/\//, ''),
  };
}
