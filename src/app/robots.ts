import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://halftrip.com.br';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/settings', '/trip/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
