'use strict';
/* Local adapter for the same functions Vercel runs. Uses your own Redis configuration. */
const http = require('http');
const page = require('../api/page');
const routes = Object.fromEntries(['admin', 'join', 'sync', 'write', 'pulse', 'session', 'health', 'page']
  .map(name => ['/api/' + name, require('../api/' + name)]));

function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status = code => { res.statusCode = code; return res; };
    res.json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
    res.send = body => res.end(body);
    try {
      const u = new URL(req.url, 'http://localhost');
      req.query = Object.fromEntries(u.searchParams);
      let handler = routes[u.pathname];
      if (u.pathname === '/') handler = page;
      else if (u.pathname === '/robots.txt') { handler = page; req.query.robots = '1'; }
      else {
        const match = /^\/r\/([a-z0-9]+)$/.exec(u.pathname);
        if (match) { handler = page; req.query.rid = match[1]; }
      }
      if (!handler) return res.status(404).json({ code: 'not_found' });
      let body = '', bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 1024 * 1024) return res.status(413).json({ code: 'too_large' });
        body += chunk;
      }
      try { req.body = body ? JSON.parse(body) : undefined; }
      catch (_) { return res.status(400).json({ code: 'invalid_json' }); }
      await handler(req, res);
    } catch (e) {
      console.error('[local server]', e.message);
      if (!res.headersSent) res.status(500).json({ code: 'unavailable' });
      else res.end();
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, '127.0.0.1', () => console.log('Virtual Offsite: http://localhost:' + port));
}
module.exports = { createServer };
