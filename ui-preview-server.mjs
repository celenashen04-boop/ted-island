// Local preview for the UI gallery in public/ui/. Zero dependencies.
// The main server (server.mjs) only serves an allowlist of files, so /ui/ is
// not reachable there. This keeps server.mjs untouched.
//
//   node ui-preview-server.mjs   then open http://127.0.0.1:4175/ui/preview.html
//
// On Vercel, /ui/ is not routed yet: vercel.json maps only some paths to public/,
// so /ui/preview.html returns 404 there. Until a /ui/ route is added, use the
// /public/ prefix on a deployment, e.g. /public/ui/mood-preview.html. The mood
// preview works fully that way; the gallery loads but its icons, badges and
// stage images (absolute /ui/ paths) do not.
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
  // The mood preview (/ui/mood-preview.html) also reads Ray's island models, read-only.
  const allowed = path.startsWith('/ui/') || path.startsWith('/island-kit/') || path === '/islands.mjs';
  if (request.method !== 'GET' || !allowed || path.includes('..') || !type) {
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
