import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from '../server/astro-single.mjs';

const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const port = 4174;
const demo = !process.argv.includes('--ai');
const handler = createHandler({ demo, apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL,
  origins: [`http://127.0.0.1:${port}`, `http://localhost:${port}`] });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
http.createServer(async (req, res) => {
  try {
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) { res.writeHead(403).end(); return; }
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === '/api/astro-single') {
      const controller = new AbortController();
      req.on('aborted', () => controller.abort());
      res.on('close', () => { if (!res.writableEnded) controller.abort(); });
      const request = new Request(url, { method: req.method, headers: req.headers, signal: controller.signal,
        ...(!['GET', 'HEAD'].includes(req.method) ? { body: req, duplex: 'half' } : {}) });
      const response = await handler(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/astro-cards.html';
    if (/^\/[\w-]+$/.test(pathname)) pathname += '.html';
    if (!(/^\/[\w-]+\.html$/.test(pathname) || /^\/assets\/[\w/.-]+$/.test(pathname))) { res.writeHead(404).end(); return; }
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) || !types[path.extname(file)]) { res.writeHead(404).end(); return; }
    let content = await readFile(file);
    if (pathname === '/astro-cards.html') content = content.toString().replace('<head>', '<head><script>window.AstroCardsPreview={disableStatistics:true};</script>');
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Local ${demo ? 'DEMO (no AI calls)' : 'AI'} preview: http://127.0.0.1:${port}/astro-cards.html#single`));
