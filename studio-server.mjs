import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['public/studios/index.html', 'text/html; charset=utf-8']],
  ['/studios', ['public/studios/index.html', 'text/html; charset=utf-8']],
  ...['spiral','verdant','pinwheel'].map(id => [
    '/studios/' + id, ['public/studios/' + id + '.html', 'text/html; charset=utf-8']
  ]),
  ['/studios/studio.css', ['public/studios/studio.css', 'text/css; charset=utf-8']],
  ['/studios/studio.mjs', ['public/studios/studio.mjs', 'text/javascript; charset=utf-8']],
  ['/islands.mjs', ['public/islands.mjs', 'text/javascript; charset=utf-8']]
]);
const modulePath = /^\/island-kit\/(?:[a-z]+\/)*[a-z0-9.-]+\.m?js$/i;
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if(request.method !== 'GET') {response.writeHead(405).end();return;}
  const entry = files.get(path) ?? (modulePath.test(path)
    ? ['public' + path, 'text/javascript; charset=utf-8'] : null);
  if(!entry) {response.writeHead(404).end('Not found');return;}
  try {
    const data = await readFile(new URL('./' + entry[0], import.meta.url));
    response.writeHead(200, {'Content-Type':entry[1], 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'});
    response.end(data);
  } catch {response.writeHead(404).end('Not found');}
});
const port = Number(process.env.PORT ?? 4174);
server.listen(port, '127.0.0.1', () => console.log(`Island studios at http://127.0.0.1:${port}`));
