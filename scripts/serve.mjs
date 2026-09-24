// Minimal static server. No dependencies.
// getUserMedia needs a secure context; http://localhost counts as one.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = normalize(join(fileURLToPath(new URL('.', import.meta.url)), '..'));
const PORT = Number(process.env.PORT) || 5173;
const HOST = '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  // The reference vocabulary ships as raw float32, not JSON - a few million
  // numbers parse far faster as bytes than as decimal text.
  '.bin': 'application/octet-stream',
  '.onnx': 'application/octet-stream',
  '.wasm': 'application/wasm',
};

const server = createServer(async (req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  if (path === '/') path = '/index.html';

  const filePath = normalize(join(ROOT, path));
  if (!filePath.startsWith(ROOT + '/')) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    const type = TYPES[extname(filePath)] ?? 'application/octet-stream';

    // The sign models are 135 MB together. Revalidating by size and mtime lets
    // a reload reuse the browser's copy while an edited file is still picked up.
    const etag = `"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' }).end();
      return;
    }
    const body = await readFile(filePath);

    // Seeking through a video needs byte ranges; without this the browser has to
    // pull the whole file before it can jump to a timestamp.
    const range = req.headers.range;
    if (range && body.length) {
      const [rawStart, rawEnd] = range.replace(/bytes=/, '').split('-');
      const start = Number(rawStart) || 0;
      const end = rawEnd ? Math.min(Number(rawEnd), body.length - 1) : body.length - 1;
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${body.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      });
      res.end(body.subarray(start, end + 1));
      return;
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': body.length,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      ETag: etag,
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Sign practice running at http://localhost:${PORT}\n`);
});
