/**
 * server.js — Servidor HTTP dedicado para el Dashboard Preámbulo (DevHub)
 *
 * PUERTO ASIGNADO: 6500
 * (Excluye expresamente los puertos de otros proyectos: 3001, 3002, 3500, 4800, 5188, 8520)
 *
 * Requiere únicamente Node.js nativo (sin dependencias externas).
 * Uso: node server.js
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 6500;
const HOST = '0.0.0.0';
const ROOT = path.resolve(__dirname);

// Tipos MIME completos
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ttf':  'font/ttf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls':  'application/vnd.ms-excel',
  '.csv':  'text/csv; charset=utf-8'
};

// Obtener IPs de la red local
function getLocalNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const server = http.createServer((req, res) => {
  // Manejo de CORS básico para previsualización local fluida
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parsear URL y decodificar
  let urlPath = req.url.split('?')[0];
  try {
    urlPath = decodeURIComponent(urlPath);
  } catch (e) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  // Ruta por defecto → index.html
  if (urlPath === '/' || urlPath === '') {
    urlPath = '/index.html';
  }

  // Normalizar ruta en el sistema de archivos
  let safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(ROOT, safePath);

  // Protección de Directory Traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Acceso denegado');
    return;
  }

  // Comprobar si es un directorio y servir su index.html
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        if (readErr.code === 'ENOENT') {
          // Si no existe, intentar fallback a index.html principal
          fs.readFile(path.join(ROOT, 'index.html'), (e2, fallbackData) => {
            if (e2) {
              res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('404 — Archivo no encontrado');
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fallbackData);
          });
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('500 — Error interno del servidor');
        }
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });
});

server.listen(PORT, HOST, () => {
  const netIPs = getLocalNetworkIPs();
  console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║     DEVHUB — SERVIDOR DEL DASHBOARD PREÁMBULO                ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`\n [✓] Servidor activo y escuchando en el puerto: ${PORT}`);
  console.log(`\n Acceso Local:`);
  console.log(`  ➜ http://localhost:${PORT}`);
  if (netIPs.length > 0) {
    console.log(`\n Acceso en Red Local (LAN):`);
    netIPs.forEach(ip => console.log(`  ➜ http://${ip}:${PORT}`));
  }
  console.log(`\n --------------------------------------------------------------`);
  console.log(` Puertos de otros proyectos respetados (sin conflicto):`);
  console.log(`  • 3001, 3002, 3500 (Predicción ACTG), 4800 (VentasPro), 5188, 8520`);
  console.log(` --------------------------------------------------------------`);
  console.log(` Presiona CTRL + C en esta ventana para detener el servidor.\n`);
});
