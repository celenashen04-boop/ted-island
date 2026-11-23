// Local preview for the UI gallery in public/ui/. Zero dependencies.
// The main server (server.mjs) only serves an allowlist of files, so /ui/ is
// not reachable there. This keeps server.mjs untouched.
//
//   node ui-preview-server.mjs   then open http://127.0.0.1:4175/ui/preview.html
//
// On Vercel, public/** is already served statically, so /ui/preview.html works there.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, normalize } from 'node:path';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (request, response) => {
  let path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
  if (path === '/' || path === '/ui' || path === '/ui/') path = '/ui/preview.html';
  const type = types[extname(path)];
  if (request.method !== 'GET' || !path.startsWith('/ui/') || path.includes('..') || !type) {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const data = await readFile(new URL('./public' + path, import.meta.url));
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(data);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

const port = Number(process.env.PORT ?? 4175);
server.listen(port, '127.0.0.1', () => console.log(`UI gallery at http://127.0.0.1:${port}/ui/preview.html`));
