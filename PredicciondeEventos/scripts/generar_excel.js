/**
 * Script para generar el archivo Excel de incidentes de ejemplo
 * Ejecutar UNA SOLA VEZ: node scripts/generar_excel.js
 */
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Centro base: zona urbana genérica (referencia latinoamericana)
const LAT_BASE = 4.6500;
const LNG_BASE = -74.0800;

const tipos = ['Robo', 'Hurto', 'Robo', 'Robo', 'Hurto', 'Lesiones', 'Robo'];
const sectores = ['Centro', 'Norte', 'Sur', 'Oriente', 'Occidente', 'Centro', 'Norte'];

function randomOffset(rango) {
  return (Math.random() - 0.5) * rango;
}

function padZ(n) { return n.toString().padStart(2, '0'); }

const incidentes = [];

// Generamos 22 incidentes distribuidos en ~3 meses
for (let i = 1; i <= 22; i++) {
  const diasAtras = Math.floor(Math.random() * 90);
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);

  // Cluster nocturno: 60% entre 20:00-02:00, 40% aleatorio
  let hora;
  if (Math.random() < 0.60) {
    const h = [20, 21, 22, 23, 0, 1, 2];
    hora = h[Math.floor(Math.random() * h.length)];
  } else {
    hora = Math.floor(Math.random() * 24);
  }
  const min = Math.floor(Math.random() * 60);

  const tipoIdx = Math.floor(Math.random() * tipos.length);
  const lat = LAT_BASE + randomOffset(0.025);
  const lng = LNG_BASE + randomOffset(0.025);

  incidentes.push({
    id: i,
    fecha: `${d.getFullYear()}-${padZ(d.getMonth() + 1)}-${padZ(d.getDate())}`,
    hora: `${padZ(hora)}:${padZ(min)}`,
    tipo: tipos[tipoIdx],
    sector: sectores[tipoIdx],
    lat: parseFloat(lat.toFixed(5)),
    lng: parseFloat(lng.toFixed(5)),
    descripcion: `Incidente de ${tipos[tipoIdx].toLowerCase()} reportado en sector ${sectores[tipoIdx]}`,
    estado: Math.random() > 0.4 ? 'Investigado' : 'Pendiente'
  });
}

const ws = XLSX.utils.json_to_sheet(incidentes);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Incidentes');
XLSX.writeFile(wb, path.join(dataDir, 'incidentes.xlsx'));

console.log(`✅ Archivo incidentes.xlsx generado con ${incidentes.length} registros.`);
