/**
 * server.js — Servidor HTTP para el Dashboard de Área de Ventas
 * Puerto: 4800  (distinto de 3001, 3002, 3500, 5188, 8520)
 *
 * Uso:  node server.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT    = process.env.PORT || 4800;
const HOST    = '0.0.0.0';          // accesible en la red local
const ROOT    = __dirname;

// Tipos MIME
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css; charset=utf-8',
  '.js'  : 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg' : 'image/svg+xml',
  '.ico' : 'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ttf' : 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Eliminar query string y decodificar URI
  let urlPath = req.url.split('?')[0];
  try { urlPath = decodeURIComponent(urlPath); } catch(e) {}

  // Ruta por defecto → index.html
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);

  // Seguridad: evitar acceso fuera del directorio raíz
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Archivo no encontrado → servir index.html (SPA fallback)
        fs.readFile(path.join(ROOT, 'index.html'), (e2, d2) => {
          if (e2) { res.writeHead(500); res.end('Error interno'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(d2);
        });
      } else {
        res.writeHead(500);
        res.end('Error interno del servidor');
      }
      return;
    }

    const ext      = path.extname(filePath).toLowerCase();
    const mimeType = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type' : mimeType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  // Obtener IP local
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  let localIP = 'localhost';
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
    if (localIP !== 'localhost') break;
  }

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║       VentasPro — Dashboard de Área de Ventas   ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Local:   http://localhost:${PORT}               ║`);
  console.log(`║  Red:     http://${localIP}:${PORT}           ║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Comparte el enlace de Red con tu equipo         ║');
  console.log('║  Ctrl+C para detener el servidor                 ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: El puerto ${PORT} ya está en uso.`);
    console.error('   Cierra el proceso que lo usa o cambia PORT en server.js\n');
  } else {
    console.error('Error del servidor:', err);
  }
  process.exit(1);
});
