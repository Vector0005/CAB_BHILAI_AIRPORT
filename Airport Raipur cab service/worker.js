export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const base = (env.API_BASE_URL || '').trim();
      if (!base) {
        return new Response(JSON.stringify({ error: 'API_BASE_URL not set', message: 'Set API_BASE_URL in Cloudflare project env to your backend /api base' }), { status: 500, headers: { 'content-type': 'application/json' } });
      }
      const target = new URL(base);
      // Preserve path and query when proxying
      const upstreamUrl = new URL(url.pathname.replace(/^\/api/, ''), target.origin);
      upstreamUrl.search = url.search;

      const init = {
        method: request.method,
        headers: new Headers(request.headers),
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer()
      };
      init.headers.delete('host');
      init.headers.delete('cf-connecting-ip');
      init.headers.delete('cf-ipcountry');
      init.headers.delete('x-forwarded-proto');

      const resp = await fetch(upstreamUrl, init);
      const respHeaders = new Headers(resp.headers);
      // Ensure same-origin consumption
      respHeaders.set('access-control-allow-origin', '*');
      return new Response(resp.body, { status: resp.status, headers: respHeaders });
    }
    if (env.ASSETS) {
      const assetResp = await env.ASSETS.fetch(request);
      if (assetResp.status !== 404) return assetResp;
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const indexReq = new Request(new URL('/index.html', url.origin), request);
      const indexResp = await env.ASSETS.fetch(indexReq);
      if (indexResp.status !== 404) return indexResp;
    }
    if (url.pathname === '/admin' || url.pathname === '/admin.html') {
      const adminReq = new Request(new URL('/admin.html', url.origin), request);
      const adminResp = await env.ASSETS.fetch(adminReq);
      if (adminResp.status !== 404) return adminResp;
    }
    return new Response('Not Found', { status: 404 });
  }
};