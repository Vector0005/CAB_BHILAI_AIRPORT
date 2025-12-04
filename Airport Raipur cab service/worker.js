export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) {
        const base = (env.API_BASE_URL || '').trim();
        if (!base) {
          return new Response(JSON.stringify({ error: 'API_BASE_URL not set', message: 'Set API_BASE_URL to your backend base URL (including /api)' }), { status: 500, headers: { 'content-type': 'application/json' } });
        }
        const upstreamUrl = new URL(base.replace(/\/$/, '') + url.pathname.replace(/^\/api/, '') + url.search);
        const init = {
          method: request.method,
          headers: new Headers(request.headers),
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer()
        };
        init.headers.delete('host');
        const resp = await fetch(upstreamUrl, init);
        return new Response(resp.body, { status: resp.status, headers: resp.headers });
      }
      const method = request.method;
      const path = url.pathname === '/' ? '/index.html' : url.pathname;
      const assetURL = new URL(path + url.search, url.origin);
      const assetInit = { method, headers: new Headers(request.headers) };
      if (!['GET', 'HEAD'].includes(method)) assetInit.body = await request.arrayBuffer();
      if (env.ASSETS) {
        const assetResp = await env.ASSETS.fetch(new Request(assetURL, assetInit));
        if (assetResp.status !== 404) return assetResp;
      }
      return new Response('Not Found', { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Worker exception', message: String(e && e.message || e) }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
  }
};