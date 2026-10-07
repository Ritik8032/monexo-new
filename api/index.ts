import app from '../server';

export default function handler(req: any, res: any) {
  try {
    const forwardedUri = req.headers['x-forwarded-uri'] || req.headers['x-rewrite-url'] || req.headers['x-original-url'];
    if (forwardedUri && typeof forwardedUri === 'string' && forwardedUri.startsWith('/')) {
      req.url = forwardedUri;
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Invocation Error]', err);
    if (!res.headersSent) {
      res.status(500).json({
        code: 500,
        msg: 'Serverless invocation error: ' + (err?.message || String(err)),
        error: err?.message || String(err)
      });
    }
  }
}
