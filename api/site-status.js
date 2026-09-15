// Public operational metadata for monitoring and search-preview diagnostics.
// Do not add account counts, private analytics, IP addresses, or user content.
export default function handler(request, response) {
  const baseUrl = process.env.PUBLIC_SITE_URL || `${request.headers['x-forwarded-proto'] || 'https'}://${request.headers.host}`;
  response.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  response.status(200).json({
    name: '影研社 · 医学影像学习平台',
    publicUrl: baseUrl,
    health: `${baseUrl}/api/health`,
    sitemap: `${baseUrl}/sitemap.xml`,
    generatedAt: new Date().toISOString()
  });
}
