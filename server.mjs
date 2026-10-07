// Local development only. GitHub Pages serves the static files directly.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('./', import.meta.url);
const allowed = new Map([
  ['index.html','text/html; charset=utf-8'], ['styles.css','text/css; charset=utf-8'],
  ['app.js','text/javascript; charset=utf-8'], ['model.js','text/javascript; charset=utf-8'],
  ['favicon.svg','image/svg+xml']
]);
allowed.set('vendor/katex/katex.min.js', 'text/javascript; charset=utf-8');
allowed.set('vendor/katex/katex.min.css', 'text/css; charset=utf-8');
for (const name of await readdir(new URL('./vendor/katex/fonts/',root))) {
 if (/\.(woff2?|ttf)$/.test(name)) allowed.set('vendor/katex/fonts/'+name, name.endsWith('.woff2')?'font/woff2':name.endsWith('.woff')?'font/woff':'font/ttf');
}
const port = Number(process.env.PORT || 8001);
const server = http.createServer(async (req,res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const name = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (!allowed.has(name)) { res.writeHead(404);res.end('Not found');return; }
    const data = await readFile(fileURLToPath(new URL(name, root)));
    res.writeHead(200, {'Content-Type':allowed.get(name), 'Cache-Control':'no-store'});
    res.end(data);
  } catch { res.writeHead(500);res.end('Could not read local file.'); }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is busy. Stop the other server, or set PORT to another number.` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}`;
  console.log(`Macro lab: ${url}\nSave your edits, then refresh your browser. Stop with Ctrl+C.`);
  if (process.argv.includes('--open')) {
    const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.on('error', () => console.log(`Open ${url} in your browser.`));
    child.unref();
  }
});
