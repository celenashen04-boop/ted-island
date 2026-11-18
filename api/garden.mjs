import { handleRequest } from '../server.mjs';

export default function garden(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const route = url.searchParams.get('__garden_route');
  if (route !== null) req.url = '/api/' + route;
  return handleRequest(req, res);
}
