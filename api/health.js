// Vercel serverless health endpoint. This is intentionally public and contains
// no user data or credentials; it confirms that the deployed site is running
// through an application runtime rather than only a static file host.
export default function handler(_request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    service: 'image-lab-web',
    status: 'ok',
    runtime: 'serverless',
    timestamp: new Date().toISOString()
  });
}
